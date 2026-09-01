import { Injectable } from '@nestjs/common';
import { SolicitudEdicionSinCambiosError } from '../../domain/errors/solicitud-edicion-sin-cambios.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EDICION_SOLICITADA =
  'Tu solicitud de corrección fue enviada — el administrador la revisa antes de aplicarla.';

/** HU-07 (ronda 3) — el Paciente pide corregir dirección de entrega y/o
 * de farmacia de un pedido ya enviado. Solo esos dos campos: no
 * medicamentos ni fecha de vencimiento de receta — cambiar medicación
 * de una receta ya validada no es un simple diff de campos, es un
 * problema clínico distinto. No aplica el cambio: crea una novedad tipo
 * 'edicion' pendiente de que el admin la apruebe o rechace. */
@Injectable()
export class SolicitarEdicionPedidoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
    detalle: string | null,
  ): Promise<{ message: string; id: string }> {
    if (!direccionEntrega?.trim() && !direccionFarmacia?.trim()) {
      throw new SolicitudEdicionSinCambiosError();
    }

    const resultado = await this.solicitudes.solicitarEdicionPedido(
      pacienteId,
      solicitudId,
      direccionEntrega,
      direccionFarmacia,
      detalle,
    );

    if (resultado.resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }

    return { message: MENSAJE_EDICION_SOLICITADA, id: resultado.id };
  }
}
