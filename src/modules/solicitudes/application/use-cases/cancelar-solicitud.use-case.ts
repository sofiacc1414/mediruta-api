import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_SOLICITUD_CANCELADA = 'Tu solicitud fue cancelada.';

/** G06 — cancela. Por ahora solo exige que no esté ya cancelada — el
 * chequeo de "no recogida por un domiciliario" se agrega cuando exista
 * ese estado (HU-09/10). */
@Injectable()
export class CancelarSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.cancelar(pacienteId, solicitudId);
    if (resultado === 'no_encontrada') {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_SOLICITUD_CANCELADA };
  }
}
