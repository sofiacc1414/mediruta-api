import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_NOVEDAD_REPORTADA =
  'Novedad reportada — el administrador y el paciente ya la pueden ver.';

/** HU-07 — reporta un incidente sin tocar el estado real del pedido
 * (convive con el paso en el que esté, ver domain/ports comment). Solo
 * el Domiciliario asignado, y solo mientras el pedido no esté ya
 * entregado/cancelado. */
@Injectable()
export class ReportarNovedadUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
    detalle: string,
  ): Promise<{ message: string; id: string }> {
    const resultado = await this.solicitudes.reportarNovedad(
      domiciliarioId,
      solicitudId,
      detalle,
    );

    if (resultado.resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }

    return { message: MENSAJE_NOVEDAD_REPORTADA, id: resultado.id };
  }
}
