import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import {
  IDENTIDAD_REQUEST_KEY,
  IdentidadAutenticada,
} from '../../domain/identidad-autenticada';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';

type RequestAutenticable = {
  headers: { authorization?: string };
  [IDENTIDAD_REQUEST_KEY]?: IdentidadAutenticada;
};

@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    private readonly accessTokens: AccessTokenPort,
    private readonly sesiones: SesionRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestAutenticable>();
    const token = extraerBearer(request.headers?.authorization);
    if (!token) {
      throw new NoAutorizadoError();
    }

    let payload: { sub: string; sid: string };
    try {
      payload = await this.accessTokens.verify(token);
    } catch {
      throw new NoAutorizadoError();
    }

    const sesionValida = await this.sesiones.validar({
      usuarioId: payload.sub,
      sid: payload.sid,
    });
    if (!sesionValida) {
      throw new NoAutorizadoError();
    }

    request[IDENTIDAD_REQUEST_KEY] = {
      usuarioId: payload.sub,
      sid: payload.sid,
    };
    return true;
  }
}

function extraerBearer(authorization?: string): string | null {
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length);
  if (!token) {
    return null;
  }

  return token;
}
