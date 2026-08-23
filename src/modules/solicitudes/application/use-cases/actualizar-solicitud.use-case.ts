import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  DatosSolicitud,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type ActualizarSolicitudCommand = DatosSolicitud & {
  pacienteId: string;
  solicitudId: string;
};

export const MENSAJE_SOLICITUD_ACTUALIZADA = 'Tu solicitud fue actualizada.';

/** G04 — editar. Solo si sigue en Borrador y es del dueño. */
@Injectable()
export class ActualizarSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    command: ActualizarSolicitudCommand,
  ): Promise<{ message: string }> {
    const { pacienteId, solicitudId, ...datos } = command;
    const actualizado = await this.solicitudes.actualizar(
      pacienteId,
      solicitudId,
      datos,
    );
    if (!actualizado) {
      throw new SolicitudNoEncontradaError();
    }
    return { message: MENSAJE_SOLICITUD_ACTUALIZADA };
  }
}
