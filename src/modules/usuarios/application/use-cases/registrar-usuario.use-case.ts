import { Injectable } from '@nestjs/common';
import { TipoRegistroInvalidoError } from '../../domain/errors/tipo-registro-invalido.error';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  esTipoRegistroPublico,
  TipoRegistro,
} from '../../domain/value-objects/tipo-registro';

export type RegistrarUsuarioCommand = {
  correo: string;
  password: string;
  tipoRegistro: string;
  /** Solo aplica si `tipoRegistro === DOMICILIARIO`. */
  altaPaciente?: boolean;
};

export type RegistrarUsuarioResultado = {
  usuarioId: string;
  correo: string;
  tipoRegistro: TipoRegistro;
  estadoCuenta: 'activa';
  estadoDomiciliario?: 'pendiente_validacion';
};

@Injectable()
export class RegistrarUsuarioUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasherPort,
    private readonly usuarios: UsuarioRepositoryPort,
  ) {}

  async execute(command: RegistrarUsuarioCommand): Promise<RegistrarUsuarioResultado> {
    const correo = command.correo.trim().toLowerCase();

    if (!esTipoRegistroPublico(command.tipoRegistro)) {
      throw new TipoRegistroInvalidoError();
    }

    const tipoRegistro = command.tipoRegistro;
    const passwordHash = await this.passwordHasher.hash(command.password);
    const usuarioId = await this.usuarios.registrar({
      correo,
      passwordHash,
      tipoRegistro,
      altaPaciente: command.altaPaciente ?? false,
    });

    return {
      usuarioId,
      correo,
      tipoRegistro,
      estadoCuenta: 'activa',
      ...(tipoRegistro === TipoRegistro.DOMICILIARIO
        ? { estadoDomiciliario: 'pendiente_validacion' as const }
        : {}),
    };
  }
}
