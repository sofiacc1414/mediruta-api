import { Injectable } from '@nestjs/common';
import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EDICION_RECHAZADA = 'Solicitud de corrección rechazada.';

/** HU-07 (ronda 3) — el Administrador rechaza una novedad de tipo
 * 'edicion': cierra la novedad sin tocar el pedido. */
@Injectable()
export class RechazarEdicionPedidoAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    adminId: string,
    novedadId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.rechazarEdicionPedidoAdmin(
      adminId,
      novedadId,
    );

    if (resultado === 'no_encontrado') {
      throw new NovedadNoEncontradaError();
    }

    return { message: MENSAJE_EDICION_RECHAZADA };
  }
}
