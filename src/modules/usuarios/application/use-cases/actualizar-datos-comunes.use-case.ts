import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_DATOS_COMUNES_ACTUALIZADOS =
  'Tus datos fueron actualizados correctamente.';

export type ActualizarDatosComunesCommand = {
  usuarioId: string;
  nombreCompleto: string;
  telefono: string;
};

export type ActualizarDatosComunesResultado = {
  message: string;
};

/** G03/G04 — nombre y teléfono, comunes a cualquier rol. */
@Injectable()
export class ActualizarDatosComunesUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(
    command: ActualizarDatosComunesCommand,
  ): Promise<ActualizarDatosComunesResultado> {
    const actualizado = await this.perfiles.actualizarDatosComunes(
      command.usuarioId,
      command.nombreCompleto,
      command.telefono,
    );
    if (!actualizado) {
      throw new NoAutorizadoError();
    }
    return { message: MENSAJE_DATOS_COMUNES_ACTUALIZADOS };
  }
}
