import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  Medicamento,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type ActualizarSolicitudCommand = {
  pacienteId: string;
  solicitudId: string;
  medicamentos: Medicamento[];
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
};

export const MENSAJE_SOLICITUD_ACTUALIZADA = 'Tu solicitud fue actualizada.';

/** G04 — editar. Solo si sigue en Borrador y es del dueño. Reemplaza
 * todos los medicamentos por los recibidos (la App reenvía la lista
 * completa en cada guardado). */
@Injectable()
export class ActualizarSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    command: ActualizarSolicitudCommand,
  ): Promise<{ message: string }> {
    const actualizado = await this.solicitudes.actualizar(
      command.pacienteId,
      command.solicitudId,
      command.medicamentos,
      command.recetaFechaVencimiento,
      command.direccionEntrega,
    );
    if (!actualizado) {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_SOLICITUD_ACTUALIZADA };
  }
}
