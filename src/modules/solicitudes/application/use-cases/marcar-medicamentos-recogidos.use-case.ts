import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_MEDICAMENTOS_RECOGIDOS =
  'Marcado — medicamentos recogidos.';

/** HU-07 — solo si el pedido está `asignado_en_camino_farmacia` y es
 * del Domiciliario que llama. */
@Injectable()
export class MarcarMedicamentosRecogidosUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.marcarMedicamentosRecogidos(
      domiciliarioId,
      solicitudId,
    );
    if (resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_MEDICAMENTOS_RECOGIDOS };
  }
}
