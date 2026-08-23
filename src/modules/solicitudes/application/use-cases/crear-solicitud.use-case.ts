import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import {
  DatosSolicitud,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type CrearSolicitudCommand = DatosSolicitud & { pacienteId: string };

export type CrearSolicitudResultado = { id: string };

/** G01 — crea la solicitud en estado Borrador. Acepta campos vacíos a
 * propósito: un Borrador puede estar incompleto, se completa de a poco
 * (G04) y recién se valida todo obligatorio al enviar (G05). */
@Injectable()
export class CrearSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    command: CrearSolicitudCommand,
  ): Promise<CrearSolicitudResultado> {
    const { pacienteId, ...datos } = command;
    const id = await this.solicitudes.crear(pacienteId, datos);
    if (!id) {
      throw new RolNoAutorizadoError();
    }
    return { id };
  }
}
