import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_PERFIL_PACIENTE_ACTUALIZADO =
  'Tu perfil de Paciente fue actualizado correctamente.';

export type ActualizarPerfilPacienteCommand = {
  usuarioId: string;
  direccion: string;
  fechaNacimiento: string;
  /** HU-09 — contexto de geocodificación, obligatorio igual que el
   * resto de los campos acá. */
  departamento: string;
  ciudad: string;
};

export type ActualizarPerfilPacienteResultado = {
  message: string;
};

/** G01/G03 — dirección + fecha de nacimiento del Paciente. */
@Injectable()
export class ActualizarPerfilPacienteUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(
    command: ActualizarPerfilPacienteCommand,
  ): Promise<ActualizarPerfilPacienteResultado> {
    const actualizado = await this.perfiles.upsertPerfilPaciente(
      command.usuarioId,
      command.direccion,
      command.fechaNacimiento,
      command.departamento,
      command.ciudad,
    );
    if (!actualizado) {
      throw new RolNoAutorizadoError();
    }
    return { message: MENSAJE_PERFIL_PACIENTE_ACTUALIZADO };
  }
}
