import { Injectable, Logger } from '@nestjs/common';
import {
  contenidoAsignacion,
  contenidoCambioEstado,
  etiquetaDeEstado,
} from '../../domain/contenido-notificacion';
import { NotificacionRepositoryPort } from '../../domain/ports/notificacion.repository.port';
import { RegistrarNotificacionUseCase } from './registrar-notificacion.use-case';

/** G01/G02 — después de un cambio de estado real del pedido. */
@Injectable()
export class NotificarCambioPedidoUseCase {
  private readonly logger = new Logger(NotificarCambioPedidoUseCase.name);

  constructor(
    private readonly notificaciones: NotificacionRepositoryPort,
    private readonly registrar: RegistrarNotificacionUseCase,
  ) {}

  async execute(solicitudId: string): Promise<void> {
    try {
      const datos = await this.notificaciones.datosPedido(solicitudId);
      if (!datos) return;

      const etiqueta = etiquetaDeEstado(datos.estado);
      if (!etiqueta) return;

      if (datos.estado === 'en_asignacion') {
        const recibido = contenidoCambioEstado('pendiente_revision');
        await this.registrar.execute({
          destinatarioId: datos.pacienteId,
          tipo: 'cambio_estado',
          titulo: recibido.titulo,
          mensaje: recibido.mensaje,
          referenciaTipo: 'pedido',
          referenciaId: solicitudId,
          claveEvento: `${solicitudId}:pendiente_revision`,
        });
      }

      const cambio = contenidoCambioEstado(datos.estado);
      await this.registrar.execute({
        destinatarioId: datos.pacienteId,
        tipo: 'cambio_estado',
        titulo: cambio.titulo,
        mensaje: cambio.mensaje,
        referenciaTipo: 'pedido',
        referenciaId: solicitudId,
        claveEvento: `${solicitudId}:${datos.estado}`,
      });

      if (
        datos.estado === 'asignado_en_camino_farmacia' &&
        datos.domiciliarioId
      ) {
        const asignacion = contenidoAsignacion();
        await this.registrar.execute({
          destinatarioId: datos.domiciliarioId,
          tipo: 'asignacion',
          titulo: asignacion.titulo,
          mensaje: asignacion.mensaje,
          referenciaTipo: 'pedido',
          referenciaId: solicitudId,
          claveEvento: `${solicitudId}:asignacion:${datos.domiciliarioId}`,
        });
      }
    } catch (error) {
      this.logger.warn(
        `No se notificó el pedido ${solicitudId}: ${(error as Error).message}`,
      );
    }
  }
}
