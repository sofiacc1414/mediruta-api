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
import { ActualizarPosicionEnVivoUseCase } from '../../application/use-cases/actualizar-posicion-en-vivo.use-case';
import { ObtenerPosicionEnVivoUseCase } from '../../application/use-cases/obtener-posicion-en-vivo.use-case';

/** Gateway dedicado al tracking GPS en vivo — mismo esqueleto que
 * `ChatGateway` (path propio, rooms por `solicitudId`, mismo mecanismo
 * de auth JWT + sesión), incluyendo desde el arranque el fix de la
 * race condition que `ChatGateway` tuvo que corregir después: sin
 * guardar la promesa de `handleConnection` en `socket.data`, el primer
 * mensaje del cliente (que se dispara apenas el transporte conecta)
 * puede llegar antes de que termine la verificación async del
 * token/sesión, y `socket.data.usuarioId` todavía estaría `undefined`. */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: '/ws-tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly accessTokens: AccessTokenPort,
    private readonly sesiones: SesionRepositoryPort,
    private readonly obtenerPosicion: ObtenerPosicionEnVivoUseCase,
    private readonly actualizarPosicion: ActualizarPosicionEnVivoUseCase,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    socket.data.autenticado = this.autenticar(socket);
    await socket.data.autenticado;
  }

  private async autenticar(socket: Socket): Promise<void> {
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

  /** El cliente lo emite al entrar a la pantalla del mapa. Reusa
   * `ObtenerPosicionEnVivoUseCase` — si el pedido no está en la
   * ventana de tracking, o el usuario no es paciente/domiciliario/
   * admin de ese pedido, no se une a ninguna room. */
  @SubscribeMessage('tracking:suscribir')
  async suscribir(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { solicitudId?: string },
  ): Promise<void> {
    await (socket.data.autenticado as Promise<void> | undefined);
    const usuarioId = socket.data.usuarioId as string | undefined;
    if (!usuarioId || !data?.solicitudId) {
      socket.emit('tracking:error', { motivo: 'solicitud_invalida' });
      return;
    }
    try {
      const posicion = await this.obtenerPosicion.execute(usuarioId, data.solicitudId);
      await socket.join(data.solicitudId);
      socket.emit('tracking:posicion_inicial', posicion);
    } catch (error) {
      socket.emit('tracking:error', { motivo: (error as Error).name });
    }
  }

  @SubscribeMessage('tracking:desuscribir')
  async desuscribir(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { solicitudId?: string },
  ): Promise<void> {
    if (data?.solicitudId) await socket.leave(data.solicitudId);
  }

  /** Solo el domiciliario del pedido — cada ping (filtro de 10m/15s
   * del lado App) reescribe `perfil_domiciliario.ubicacion` y se
   * retransmite a la room (paciente + admin, si están mirando). */
  @SubscribeMessage('tracking:enviar_posicion')
  async enviarPosicion(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { solicitudId?: string; lat?: number; lng?: number },
  ): Promise<void> {
    await (socket.data.autenticado as Promise<void> | undefined);
    const usuarioId = socket.data.usuarioId as string | undefined;
    if (!usuarioId || !data?.solicitudId || data.lat == null || data.lng == null) {
      socket.emit('tracking:error', { motivo: 'posicion_invalida' });
      return;
    }
    try {
      await this.actualizarPosicion.execute(usuarioId, data.solicitudId, data.lat, data.lng);
      this.server.to(data.solicitudId).emit('tracking:posicion', {
        lat: data.lat,
        lng: data.lng,
        actualizadoEn: new Date().toISOString(),
      });
    } catch (error) {
      const nombre = (error as Error).name;
      if (nombre === 'PedidoNoEnCaminoError') {
        // Avisa a toda la room — el paciente/admin no tiene por qué
        // seguir esperando pings que ya no van a llegar.
        this.server.to(data.solicitudId).emit('tracking:finalizado');
      }
      socket.emit('tracking:error', { motivo: nombre });
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
