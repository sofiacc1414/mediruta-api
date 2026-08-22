import { Injectable } from '@nestjs/common';
import { CambioContrasenaInvalidoError } from '../../domain/errors/cambio-contrasena-invalido.error';
import { NuevaContrasenaIgualError } from '../../domain/errors/nueva-contrasena-igual.error';
import { CambioContrasenaRepositoryPort } from '../../domain/ports/cambio-contrasena.repository.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

export const MENSAJE_CONTRASENA_CAMBIADA =
  'La contraseña fue cambiada correctamente.';

export type CambiarContrasenaCommand = {
  usuarioId: string;
  sid: string;
  passwordActual: string;
  nuevaPassword: string;
};

export type CambiarContrasenaResultado = {
  message: string;
};

@Injectable()
export class CambiarContrasenaUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasherPort,
    private readonly cambios: CambioContrasenaRepositoryPort,
  ) {}

  async execute(
    command: CambiarContrasenaCommand,
  ): Promise<CambiarContrasenaResultado> {
    const passwordHashActual = await this.cambios.obtenerPasswordHash(
      command.usuarioId,
      command.sid,
    );
    if (!passwordHashActual) {
      throw new CambioContrasenaInvalidoError();
    }

    const passwordActualCorrecta = await this.passwordHasher.compare(
      command.passwordActual,
      passwordHashActual,
    );
    if (!passwordActualCorrecta) {
      throw new CambioContrasenaInvalidoError();
    }

    if (command.nuevaPassword === command.passwordActual) {
      throw new NuevaContrasenaIgualError();
    }

    const nuevoPasswordHash = await this.passwordHasher.hash(
      command.nuevaPassword,
    );
    const cambiada = await this.cambios.cambiar(
      command.usuarioId,
      command.sid,
      passwordHashActual,
      nuevoPasswordHash,
    );
    if (!cambiada) {
      throw new CambioContrasenaInvalidoError();
    }

    return { message: MENSAJE_CONTRASENA_CAMBIADA };
  }
}
