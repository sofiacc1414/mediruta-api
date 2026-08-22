import { Injectable } from '@nestjs/common';
import { RecuperacionInvalidaError } from '../../domain/errors/recuperacion-invalida.error';
import { CodigoRecuperacionPort } from '../../domain/ports/codigo-recuperacion.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RecuperacionContrasenaRepositoryPort } from '../../domain/ports/recuperacion-contrasena.repository.port';

export const MENSAJE_CONTRASENA_RESTABLECIDA =
  'La contraseña fue restablecida correctamente.';

export type RestablecerContrasenaCommand = {
  correo: string;
  codigo: string;
  nuevaPassword: string;
};

export type RestablecerContrasenaResultado = {
  message: string;
};

@Injectable()
export class RestablecerContrasenaUseCase {
  constructor(
    private readonly codigos: CodigoRecuperacionPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly recuperaciones: RecuperacionContrasenaRepositoryPort,
  ) {}

  async execute(
    command: RestablecerContrasenaCommand,
  ): Promise<RestablecerContrasenaResultado> {
    const correo = command.correo.trim().toLowerCase();
    const codigoHash = this.codigos.hashCodigo(command.codigo);
    const nuevoPasswordHash = await this.passwordHasher.hash(
      command.nuevaPassword,
    );

    const restablecida = await this.recuperaciones.restablecer({
      correo,
      codigoHash,
      nuevoPasswordHash,
    });

    if (!restablecida) {
      throw new RecuperacionInvalidaError();
    }

    return { message: MENSAJE_CONTRASENA_RESTABLECIDA };
  }
}
