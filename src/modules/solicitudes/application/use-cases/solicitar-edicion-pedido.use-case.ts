import { Injectable } from '@nestjs/common';
import { SolicitudEdicionSinCambiosError } from '../../domain/errors/solicitud-edicion-sin-cambios.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  Medicamento,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EDICION_SOLICITADA =
  'Tu solicitud de corrección fue enviada — el administrador la revisa antes de aplicarla.';

/** HU-07 (ronda 3/4) — el Paciente pide corregir dirección de entrega,
 * de farmacia y/o medicamentos de un pedido ya enviado. La foto de
 * receta va aparte (`AdjuntarRecetaPropuestaEdicionUseCase`, multipart,
 * después de creada esta novedad) — `incluyeReceta` evita que pedir
 * *solo* cambiar la foto falle por "sin cambios" acá.
 *
 * Antes (ronda 3) el equipo excluyó a propósito medicamentos/receta de
 * este flujo, por ser "un problema clínico distinto" a un simple diff
 * de texto. Decisión revisada: el control clínico pasa a ser la
 * revisión humana del Administrador sobre el diff completo en el panel
 * (incluida la foto antes/después), no una restricción de qué campos
 * se pueden pedir corregir. No aplica ningún cambio de una: crea una
 * novedad tipo 'edicion' pendiente de que el admin la apruebe o
 * rechace. */
@Injectable()
export class SolicitarEdicionPedidoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
    detalle: string | null,
    medicamentos: Medicamento[] | null,
    incluyeReceta: boolean,
  ): Promise<{ message: string; id: string }> {
    const hayMedicamentos = !!medicamentos && medicamentos.length > 0;
    if (
      !direccionEntrega?.trim() &&
      !direccionFarmacia?.trim() &&
      !hayMedicamentos &&
      !incluyeReceta
    ) {
      throw new SolicitudEdicionSinCambiosError();
    }

    const resultado = await this.solicitudes.solicitarEdicionPedido(
      pacienteId,
      solicitudId,
      direccionEntrega,
      direccionFarmacia,
      detalle,
      medicamentos,
      incluyeReceta,
    );

    if (resultado.resultado === 'no_encontrado') {
      throw new SolicitudNoEncontradaError();
    }

    return { message: MENSAJE_EDICION_SOLICITADA, id: resultado.id };
  }
}
