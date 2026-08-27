import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_NOVEDAD_REPORTADA_PACIENTE =
  'Novedad reportada — el administrador ya la puede ver.';

/** HU-07 (ronda 2) — el Paciente también puede reportar una novedad
 * sobre su propio pedido, mismo criterio que `ReportarNovedadUseCase`
 * (Domiciliario) pero validado contra `paciente_id`. */
@Injectable()
export class ReportarNovedadPacienteUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
    detalle: string,
  ): Promise<{ message: string; id: string }> {
    const resultado = await this.solicitudes.reportarNovedadPaciente(
      pacienteId,
      solicitudId,
      detalle,
    );

    if (resultado.resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }

    return { message: MENSAJE_NOVEDAD_REPORTADA_PACIENTE, id: resultado.id };
  }
}
