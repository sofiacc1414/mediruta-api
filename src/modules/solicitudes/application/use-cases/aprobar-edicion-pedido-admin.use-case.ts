import { Injectable } from '@nestjs/common';
import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EDICION_APROBADA =
  'Corrección aplicada al pedido.';

/** HU-07 (ronda 3) — el Administrador aprueba una novedad de tipo
 * 'edicion': aplica los datos propuestos al pedido y cierra la
 * novedad. */
@Injectable()
export class AprobarEdicionPedidoAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    adminId: string,
    novedadId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.aprobarEdicionPedidoAdmin(
      adminId,
      novedadId,
    );

    if (resultado === 'no_encontrado') {
      throw new NovedadNoEncontradaError();
    }

    return { message: MENSAJE_EDICION_APROBADA };
  }
}
