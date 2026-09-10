import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccessTokenPort } from '../../../usuarios/domain/ports/access-token.port';
import { SesionRepositoryPort } from '../../../usuarios/domain/ports/sesion.repository.port';
import { EventosTiempoRealPort } from '../../domain/ports/eventos-tiempo-real.port';

/**
 * Ver `EventosTiempoRealPort` para el porqué. `PostgresSolicitudRepository`
 * llama a `emitirPedidoActualizado()` después de cualquier acción que
 * cambia un pedido (aceptar, marcar un paso, cancelar, reportar/
 * resolver novedad, asignación por admin, etc.) — acá solo se maneja
 * la conexión (autenticación con el mismo JWT de siempre, vía el
 * handshake) y el broadcast.
 *
 * Broadcast a TODOS los conectados, sin distinguir destinatario — el
 * evento no lleva datos del pedido, cada cliente ya sabe qué volver a
 * pedir para sí mismo. Cuesta algún refetch de más a alguien a quien
 * no le tocaba, pero evita mantener un mapa de "quién está mirando
 * qué pedido" solo para esto.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: '/ws',
})
export class EventosGateway
  extends EventosTiempoRealPort
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventosGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly accessTokens: AccessTokenPort,
    private readonly sesiones: SesionRepositoryPort,
  ) {
    super();
  }

  async handleConnection(socket: Socket): Promise<void> {
    // Temporal — para diagnosticar por qué algunos clientes móviles no
    // logran conectar. Ver DiagnosticoConexionCard del lado App.
    this.logger.log(
      `Conexión entrante ${socket.id} (transporte inicial: ${socket.conn.transport.name})`,
    );

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
      this.logger.log(`${socket.id}: autenticado (usuario ${payload.sub}).`);
    } catch (error) {
      this.logger.warn(`${socket.id}: token inválido (${(error as Error).message}), se desconecta.`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`${socket.id}: desconectado.`);
  }

  emitirPedidoActualizado(): void {
    if (!this.server) {
      // Puede pasar en tests/arranque muy temprano — no debe tumbar
      // la operación que disparó el evento.
      this.logger.warn(
        'emitirPedidoActualizado() llamado sin servidor WS activo todavía.',
      );
      return;
    }
    this.server.emit('pedido:actualizado');
  }
}

/** El cliente manda el access token en `auth.token` del handshake de
 * socket.io (no en un header — socket.io-client de Flutter/JS lo arma
 * así de simple) — mismo token que ya usan los requests HTTP, sin
 * inventar un mecanismo de auth aparte. */
function extraerToken(socket: Socket): string | null {
  const desdeAuth = socket.handshake.auth?.token as unknown;
  if (typeof desdeAuth === 'string' && desdeAuth.length > 0) {
    return desdeAuth;
  }
  const header = socket.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length);
  }
  return null;
}
