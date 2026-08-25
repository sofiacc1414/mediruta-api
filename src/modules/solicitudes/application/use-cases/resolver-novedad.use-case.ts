import { Injectable } from '@nestjs/common';
import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_NOVEDAD_RESUELTA = 'Novedad marcada como resuelta.';

/** HU-07 — el Administrador cierra una novedad. No toca el estado del
 * pedido — el pedido sigue su curso solo. */
@Injectable()
export class ResolverNovedadUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(adminId: string, novedadId: string): Promise<{ message: string }> {
    const resultado = await this.solicitudes.resolverNovedad(adminId, novedadId);
    if (resultado === 'no_encontrado') {
      throw new NovedadNoEncontradaError();
    }
    return { message: MENSAJE_NOVEDAD_RESUELTA };
  }
}
