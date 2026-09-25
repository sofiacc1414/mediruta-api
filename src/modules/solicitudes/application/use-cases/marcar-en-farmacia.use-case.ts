import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EN_FARMACIA = 'Llegaste a la farmacia.';

/** Solo si el pedido está `asignado_en_camino_farmacia` y es del
 * domiciliario que llama. A partir de acá se habilita la cédula. */
@Injectable()
export class MarcarEnFarmaciaUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.marcarEnFarmacia(
      domiciliarioId,
      solicitudId,
    );
    if (resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_EN_FARMACIA };
  }
}
