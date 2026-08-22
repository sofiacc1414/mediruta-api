import { Injectable } from '@nestjs/common';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RefreshTokenPort } from '../../domain/ports/refresh-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';
import {
  UsuarioRepositoryPort,
  UsuarioRol,
} from '../../domain/ports/usuario.repository.port';

/**
 * Hash bcrypt válido y constante. No se guarda en BD.
 * Solo iguala el tiempo de respuesta cuando el correo no existe.
 */
export const DUMMY_PASSWORD_HASH =
  '$2b$12$RiPcGt7eLad9XcrFb4kFV.UHrzJjLTWP9mktYg7Ym5Jmda/Y2Nyh.';

export type IniciarSesionCommand = {
  correo: string;
  password: string;
  userAgent?: string | null;
  ip?: string | null;
};

export type IniciarSesionResultado = {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    correo: string;
    estadoCuenta: 'activa';
    roles: UsuarioRol[];
  };
};

@Injectable()
export class IniciarSesionUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasherPort,
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly refreshTokens: RefreshTokenPort,
    private readonly sesiones: SesionRepositoryPort,
    private readonly accessTokens: AccessTokenPort,
  ) {}

  async execute(command: IniciarSesionCommand): Promise<IniciarSesionResultado> {
    const correo = command.correo.trim().toLowerCase();
    const credenciales = await this.usuarios.obtenerCredencialesLogin(correo);

    if (!credenciales) {
      await this.passwordHasher.compare(command.password, DUMMY_PASSWORD_HASH);
      throw new CredencialesInvalidasError();
    }

    const passwordCorrecta = await this.passwordHasher.compare(
      command.password,
      credenciales.passwordHash,
    );
    if (!passwordCorrecta || credenciales.estadoCuenta !== 'activa') {
      throw new CredencialesInvalidasError();
    }

    const refresh = this.refreshTokens.generar();
    const sid = await this.sesiones.crear({
      usuarioId: credenciales.usuarioId,
      refreshTokenHash: refresh.hash,
      expiraEn: refresh.expiraEn,
      userAgent: command.userAgent ?? null,
      ip: command.ip ?? null,
    });

    const accessToken = await this.accessTokens.sign({
      sub: credenciales.usuarioId,
      sid,
    });
    const roles = await this.usuarios.obtenerRoles(credenciales.usuarioId);

    return {
      accessToken,
      refreshToken: refresh.token,
      usuario: {
        id: credenciales.usuarioId,
        correo: credenciales.correo,
        estadoCuenta: 'activa',
        roles,
      },
    };
  }
}
