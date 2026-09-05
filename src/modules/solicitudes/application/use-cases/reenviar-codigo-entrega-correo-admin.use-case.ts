import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { CorreoCodigoEntregaPort } from '../../domain/ports/correo-codigo-entrega.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_CODIGO_REENVIADO =
  'Código de entrega reenviado al correo del paciente.';

/** HU-07 (ronda 3) — el Administrador reenvía por correo el código de
 * entrega vigente (no genera uno nuevo — para eso está
 * `RegenerarCodigoEntregaAdminUseCase`, un caso de uso aparte). */
@Injectable()
export class ReenviarCodigoEntregaCorreoAdminUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly correo: CorreoCodigoEntregaPort,
  ) {}

  async execute(
    adminId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const datos = await this.solicitudes.obtenerCodigoEntregaParaCorreoAdmin(
      adminId,
      solicitudId,
    );

    if (
      datos.resultado !== 'ok' ||
      !datos.codigoEntrega ||
      !datos.pacienteCorreo
    ) {
      throw new SolicitudNoEncontradaError();
    }

    await this.correo.enviarCodigoEntrega(
      datos.pacienteCorreo,
      datos.pacienteNombre,
      datos.codigoPedido,
      datos.codigoEntrega,
    );

    return { message: MENSAJE_CODIGO_REENVIADO };
  }
}
