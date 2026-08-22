import { Injectable } from '@nestjs/common';
import { RefreshTokenInvalidoError } from '../../domain/errors/refresh-token-invalido.error';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { RefreshTokenPort } from '../../domain/ports/refresh-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';

export type RefrescarSesionCommand = {
  refreshToken: string;
  userAgent?: string | null;
  ip?: string | null;
};

export type RefrescarSesionResultado = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class RefrescarSesionUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenPort,
    private readonly sesiones: SesionRepositoryPort,
    private readonly accessTokens: AccessTokenPort,
  ) {}

  async execute(
    command: RefrescarSesionCommand,
  ): Promise<RefrescarSesionResultado> {
    if (!command.refreshToken) {
      throw new RefreshTokenInvalidoError();
    }

    const hashActual = this.refreshTokens.hash(command.refreshToken);
    const nuevo = this.refreshTokens.generar();
    const rotacion = await this.sesiones.rotar({
      refreshTokenHashActual: hashActual,
      nuevoRefreshTokenHash: nuevo.hash,
      nuevaExpiraEn: nuevo.expiraEn,
      userAgent: command.userAgent ?? null,
      ip: command.ip ?? null,
    });

    if (!rotacion) {
      throw new RefreshTokenInvalidoError();
    }

    const accessToken = await this.accessTokens.sign({
      sub: rotacion.usuarioId,
      sid: rotacion.sid,
    });

    return {
      accessToken,
      refreshToken: nuevo.token,
    };
  }
}
