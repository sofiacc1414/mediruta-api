import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenPort } from '../../../usuarios/domain/ports/access-token.port';
import { SesionRepositoryPort } from '../../../usuarios/domain/ports/sesion.repository.port';
import { EnviarMensajeChatUseCase } from '../../application/use-cases/enviar-mensaje-chat.use-case';
import { ObtenerChatPedidoUseCase } from '../../application/use-cases/obtener-chat-pedido.use-case';

/** Gateway de WebSocket dedicado al chat — separado de `EventosGateway`
 * (que vive en `solicitudes` y hace `server.emit()` global sin rooms,
 * pensado solo para "algo cambió, andá a refetchear lo tuyo"). Acá el
 * CONTENIDO del mensaje viaja en el evento, así que hace falta
 * dirigirlo: una room de Socket.IO por `chatId`, en la que solo entran
 * los sockets que `ObtenerChatPedidoUseCase` ya validó como paciente o
 * domiciliario de ese pedido (o el Admin, que audita en tiempo real
 * desde el panel Web usando el mismo mecanismo).
 *
 * Mismo mecanismo de auth que `EventosGateway` (JWT del handshake +
 * `SesionRepositoryPort.validar`), a propósito — nada nuevo que
 * mantener del lado de la App/Web, mismo token que ya usan. */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: '/ws-chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly accessTokens: AccessTokenPort,
    private readonly sesiones: SesionRepositoryPort,
    private readonly obtenerChat: ObtenerChatPedidoUseCase,
    private readonly enviarMensaje: EnviarMensajeChatUseCase,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = extraerToken(socket);
    if (!token) {
      this.logger.warn(`${socket.id}: sin token en el handshake, se desconecta.`);
      socket.disconnect(true);
      return;
    }
    try {
      const payload = await this.accessTokens.verify(token);
      const sesionValida = await this.sesiones.validar({
        usuarioId: payload.sub,
        sid: payload.sid,
      });
      if (!sesionValida) {
        this.logger.warn(`${socket.id}: sesión inválida (usuario ${payload.sub}), se desconecta.`);
        socket.disconnect(true);
        return;
      }
      socket.data.usuarioId = payload.sub;
      this.logger.log(`${socket.id}: autenticado (usuario ${payload.sub}).`);
    } catch (error) {
      this.logger.warn(`${socket.id}: token inválido (${(error as Error).message}), se desconecta.`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`${socket.id}: desconectado.`);
  }

  /** El cliente lo emite al entrar a la pantalla de chat de un pedido.
   * Reusa `ObtenerChatPedidoUseCase` (misma validación que el REST) —
   * si el usuario no es paciente ni domiciliario de esa solicitud, o
   * el pedido todavía no tiene domiciliario asignado, no se une a
   * ninguna room y se avisa con `chat:error`. */
  @SubscribeMessage('chat:join')
  async join(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { solicitudId?: string },
  ): Promise<void> {
    const usuarioId = socket.data.usuarioId as string | undefined;
    if (!usuarioId || !data?.solicitudId) {
      socket.emit('chat:error', { motivo: 'solicitud_invalida' });
      return;
    }
    try {
      const chat = await this.obtenerChat.execute(usuarioId, data.solicitudId);
      await socket.join(chat.chatId);
      socket.emit('chat:unido', { chatId: chat.chatId, soloLectura: chat.soloLectura });
    } catch (error) {
      socket.emit('chat:error', { motivo: (error as Error).name });
    }
  }

  @SubscribeMessage('chat:enviar_mensaje')
  async enviar(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { chatId?: string; contenido?: string },
  ): Promise<void> {
    const usuarioId = socket.data.usuarioId as string | undefined;
    if (!usuarioId || !data?.chatId || !data?.contenido) {
      socket.emit('chat:error', { motivo: 'mensaje_invalido' });
      return;
    }
    try {
      const mensaje = await this.enviarMensaje.execute(
        usuarioId,
        data.chatId,
        data.contenido,
      );
      this.server.to(data.chatId).emit('chat:nuevo_mensaje', mensaje);
    } catch (error) {
      const nombre = (error as Error).name;
      if (nombre === 'ChatSoloLecturaError') {
        // Avisa a toda la room (no solo a quien lo intentó) — así la
        // otra punta también congela la UI sin tener que hacer
        // polling para enterarse de que venció la ventana de 30 min.
        this.server.to(data.chatId).emit('chat:cambio_estado', {
          soloLectura: true,
        });
      }
      socket.emit('chat:error', { motivo: nombre });
    }
  }
}

function extraerToken(socket: Socket): string | null {
  const desdeAuth = socket.handshake.auth?.token as unknown;
  if (typeof desdeAuth === 'string' && desdeAuth.length > 0) return desdeAuth;
  const header = socket.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  return null;
}
