import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_CODIGO_NO_GENERADO_REPORTADO =
  'Reportamos el problema con tu código — el administrador te lo va a enviar de nuevo.';

/** HU-07 (ronda 3) — el Paciente reporta que el código de entrega no se
 * generó o no lo ve en su pantalla. Crea una novedad tipo 'codigo', sin
 * datos propuestos — el admin actúa directo sobre el pedido
 * (regenerar/reenviar), no hay nada que aprobar. */
@Injectable()
export class ReportarCodigoNoGeneradoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

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

    return { message: MENSAJE_CODIGO_NO_GENERADO_REPORTADO, id: resultado.id };
  }
}
