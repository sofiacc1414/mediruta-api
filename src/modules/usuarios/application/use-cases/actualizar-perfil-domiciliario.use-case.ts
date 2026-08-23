import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_PERFIL_DOMICILIARIO_ACTUALIZADO =
  'Tu perfil de Domiciliario fue actualizado correctamente.';

export type ActualizarPerfilDomiciliarioCommand = {
  usuarioId: string;
  direccion: string;
  vehiculoTipo: string;
  vehiculoPlaca: string;
};

export type ActualizarPerfilDomiciliarioResultado = {
  message: string;
};

/** G01/G03 — dirección + vehículo del Domiciliario. */
@Injectable()
export class ActualizarPerfilDomiciliarioUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(
    command: ActualizarPerfilDomiciliarioCommand,
  ): Promise<ActualizarPerfilDomiciliarioResultado> {
    const actualizado = await this.perfiles.upsertPerfilDomiciliario(
      command.usuarioId,
      command.direccion,
      command.vehiculoTipo,
      command.vehiculoPlaca,
    );
    if (!actualizado) {
      throw new RolNoAutorizadoError();
    }
    return { message: MENSAJE_PERFIL_DOMICILIARIO_ACTUALIZADO };
  }
}
