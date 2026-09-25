import { Injectable, Logger } from '@nestjs/common';
import { NotificacionRepositoryPort } from '../../domain/ports/notificacion.repository.port';
import {
  AvisoPush,
  PushNotificacionPort,
} from '../../domain/ports/push-notificacion.port';

export type RegistrarNotificacionEntrada = {
  destinatarioId: string;
  tipo: 'cambio_estado' | 'asignacion' | 'validacion_cuenta';
  titulo: string;
  mensaje: string;
  referenciaTipo: 'pedido' | 'cuenta';
  referenciaId: string | null;
  claveEvento: string;
};

/** Persiste y, si hay token, intenta el push. Un duplicado (misma clave)
 * no se vuelve a guardar ni a enviar. */
@Injectable()
export class RegistrarNotificacionUseCase {
  private readonly logger = new Logger(RegistrarNotificacionUseCase.name);

  constructor(
    private readonly notificaciones: NotificacionRepositoryPort,
    private readonly push: PushNotificacionPort,
  ) {}

  async execute(entrada: RegistrarNotificacionEntrada): Promise<void> {
    const id = await this.notificaciones.guardar(entrada);
    if (!id) return;

    const tokens = await this.notificaciones.tokensPush(entrada.destinatarioId);
    const aviso: AvisoPush = {
      tokens,
      titulo: entrada.titulo,
      mensaje: entrada.mensaje,
      referenciaTipo: entrada.referenciaTipo,
      referenciaId: entrada.referenciaId,
    };
    try {
      await this.push.enviar(aviso);
    } catch (error) {
      this.logger.warn(
        `Push no enviado (${entrada.claveEvento}): ${(error as Error).message}`,
      );
    }
  }
}
