import { Injectable, Logger } from '@nestjs/common';
import { RegistrarNotificacionUseCase } from '../../../notificaciones/application/use-cases/registrar-notificacion.use-case';
import { NoAutorizadoError } from '../../../usuarios/domain/errors/no-autorizado.error';
import { SolicitudNoEncontradaError } from '../../../solicitudes/domain/errors/solicitud-no-encontrada.error';
import { ChatSoloLecturaError } from '../../domain/errors/chat-solo-lectura.error';
import {
  ChatRepositoryPort,
  MensajeChat,
} from '../../domain/ports/chat.repository.port';

const CONTENIDO_MAX_LARGO = 60;

/** Guarda el mensaje y, best-effort, notifica por push a la
 * contraparte (mismo criterio que `NotificarCambioPedidoUseCase`: un
 * push que falla no debe tumbar el envío del mensaje, que ya se
 * guardó). Se dispara siempre, no solo si la contraparte está
 * desconectada — detectar presencia en tiempo real es más
 * complejidad de la que vale la pena acá; el cliente puede silenciar
 * la notificación si ya tiene el chat abierto. */
@Injectable()
export class EnviarMensajeChatUseCase {
  private readonly logger = new Logger(EnviarMensajeChatUseCase.name);

  constructor(
    private readonly chats: ChatRepositoryPort,
    private readonly registrarNotificacion: RegistrarNotificacionUseCase,
  ) {}

  async execute(
    usuarioId: string,
    chatId: string,
    contenido: string,
  ): Promise<MensajeChat> {
    const resultado = await this.chats.enviarMensaje(usuarioId, chatId, contenido);
    switch (resultado.resultado) {
      case 'ok':
        await this.notificar(
          resultado.destinatarioId,
          resultado.solicitudId,
          resultado.mensaje,
        );
        return resultado.mensaje;
      case 'chat_no_encontrado':
        throw new SolicitudNoEncontradaError();
      case 'chat_solo_lectura':
        throw new ChatSoloLecturaError();
      case 'no_autorizado':
        throw new NoAutorizadoError();
      case 'contenido_vacio':
        // El DTO ya exige contenido no vacío — esta rama es defensiva,
        // no se espera alcanzarla desde la API real.
        throw new Error('El mensaje no puede estar vacío.');
    }
  }

  private async notificar(
    destinatarioId: string,
    solicitudId: string,
    mensaje: MensajeChat,
  ): Promise<void> {
    try {
      const extracto =
        mensaje.contenido.length > CONTENIDO_MAX_LARGO
          ? `${mensaje.contenido.slice(0, CONTENIDO_MAX_LARGO)}…`
          : mensaje.contenido;
      await this.registrarNotificacion.execute({
        destinatarioId,
        tipo: 'mensaje_chat',
        titulo: 'Nuevo mensaje',
        mensaje: extracto,
        referenciaTipo: 'pedido',
        referenciaId: solicitudId,
        claveEvento: mensaje.id,
      });
    } catch (error) {
      this.logger.warn(
        `No se notificó el mensaje ${mensaje.id}: ${(error as Error).message}`,
      );
    }
  }
}
