import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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

/** Como `AccessAuthGuard`, pero nunca bloquea — si hay un token válido
 * lo adjunta a la request, si no (o es inválido/expirado) deja pasar
 * igual sin identidad. Para endpoints que responden distinto si sabés
 * quién pregunta, pero igual deben servir a alguien sin sesión (ej. el
 * chatbot: dudas de registro/contraseña son para gente que ni
 * siquiera tiene cuenta todavía). */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly accessTokens: AccessTokenPort,
    private readonly sesiones: SesionRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestAutenticable>();
    const token = extraerBearer(request.headers?.authorization);
    if (!token) {
      return true;
    }

    try {
      const payload = await this.accessTokens.verify(token);
      const sesionValida = await this.sesiones.validar({
        usuarioId: payload.sub,
        sid: payload.sid,
      });
      if (sesionValida) {
        request[IDENTIDAD_REQUEST_KEY] = {
          usuarioId: payload.sub,
          sid: payload.sid,
        };
      }
    } catch {
      // Token inválido/expirado — se sigue sin identidad, no se bloquea.
    }

    return true;
  }
}

function extraerBearer(authorization?: string): string | null {
  if (
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ')
  ) {
    return null;
  }

  const token = authorization.slice('Bearer '.length);
  if (!token) {
    return null;
  }

  return token;
}
