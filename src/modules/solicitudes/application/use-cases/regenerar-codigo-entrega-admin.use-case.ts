import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_CODIGO_REGENERADO =
  'Se generó un nuevo código de entrega.';

/** HU-07 (ronda 3) — el Administrador regenera el código de entrega de
 * un pedido cuando el paciente reporta no haberlo visto. No cambia
 * `estado`, no cierra por sí sola ninguna novedad — el admin la
 * resuelve aparte una vez que ya actuó. */
@Injectable()
export class RegenerarCodigoEntregaAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    adminId: string,
    solicitudId: string,
  ): Promise<{ message: string; codigoEntrega: string }> {
    const { resultado, codigoEntrega } =
      await this.solicitudes.regenerarCodigoEntregaAdmin(adminId, solicitudId);

    if (resultado !== 'regenerado' || !codigoEntrega) {
      throw new SolicitudNoEncontradaError();
    }

    return { message: MENSAJE_CODIGO_REGENERADO, codigoEntrega };
  }
}
