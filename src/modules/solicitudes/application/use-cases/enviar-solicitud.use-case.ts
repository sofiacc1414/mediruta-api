import { Injectable } from '@nestjs/common';
import { SolicitudIncompletaError } from '../../domain/errors/solicitud-incompleta.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_SOLICITUD_ENVIADA = 'Tu solicitud fue enviada a revisión.';

/** G05 — envía a revisión. Si falta algún obligatorio, no cambia nada y
 * lanza SolicitudIncompletaError con el detalle de qué falta. */
@Injectable()
export class EnviarSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.enviar(pacienteId, solicitudId);

    switch (resultado.resultado) {
      case 'enviada':
        return { message: MENSAJE_SOLICITUD_ENVIADA };
      case 'incompleta':
        throw new SolicitudIncompletaError(resultado.faltantes);
      case 'no_encontrada':
        throw new SolicitudNoEncontradaError();
    }
  }
}
