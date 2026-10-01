import { Injectable, Logger } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { CorreoCodigoEntregaPort } from '../../domain/ports/correo-codigo-entrega.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_CODIGO_NO_GENERADO_REPORTADO =
  'Generamos un código nuevo y te lo reenviamos por correo.';

/** El Paciente reporta que el código de entrega no se generó o no lo
 * ve en su pantalla. A diferencia del diseño original (HU-07, ronda
 * 3), ya NO depende de que un admin note la novedad y regenere a
 * mano — regenera el código y lo reenvía por correo en el mismo
 * paso (ver migración `20260930200000_codigo_entrega_autoregenera_
 * al_reportar.sql`). La novedad igual queda registrada para
 * auditoría/historial, pero autorresuelta — nunca aparece en la cola
 * de "novedades abiertas" del admin. El envío de correo es
 * best-effort: si falla, el código ya quedó regenerado y válido en
 * la base (el paciente puede reportar de nuevo o pedirle al admin
 * que lo reenvíe manualmente, que sigue existiendo como respaldo). */
@Injectable()
export class ReportarCodigoNoGeneradoUseCase {
  private readonly logger = new Logger(ReportarCodigoNoGeneradoUseCase.name);

  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly correo: CorreoCodigoEntregaPort,
  ) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
    detalle: string | null,
  ): Promise<{ message: string; id: string }> {
    const resultado = await this.solicitudes.reportarCodigoNoGenerado(
      pacienteId,
      solicitudId,
      detalle,
    );

    if (resultado.resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }

    try {
      await this.correo.enviarCodigoEntrega(
        resultado.pacienteCorreo,
        resultado.pacienteNombre,
        resultado.codigoPedido,
        resultado.codigoEntrega,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo reenviar el código regenerado de la solicitud ${solicitudId}: ${(error as Error).message}`,
      );
    }

    return { message: MENSAJE_CODIGO_NO_GENERADO_REPORTADO, id: resultado.id };
  }
}
