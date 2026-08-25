import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EN_SITIO = 'Marcado — llegaste a la dirección del paciente.';

/** HU-07 — solo si el pedido está `en_camino_entrega` y es del
 * Domiciliario que llama. */
@Injectable()
export class MarcarEnSitioUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.marcarEnSitio(
      domiciliarioId,
      solicitudId,
    );
    if (resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_EN_SITIO };
  }
}
