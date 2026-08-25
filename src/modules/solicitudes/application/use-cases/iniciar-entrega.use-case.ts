import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_ENTREGA_INICIADA = 'Marcado — vas hacia el paciente.';

/** HU-07 — solo si el pedido está `medicamentos_recogidos` y es del
 * Domiciliario que llama. */
@Injectable()
export class IniciarEntregaUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.iniciarEntrega(
      domiciliarioId,
      solicitudId,
    );
    if (resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_ENTREGA_INICIADA };
  }
}
