import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  IDENTIDAD_REQUEST_KEY,
  IdentidadAutenticada,
} from '../../domain/identidad-autenticada';

/** Par de `OptionalAuthGuard` — a diferencia de `@UsuarioAutenticado()`,
 * nunca lanza `NoAutorizadoError`: devuelve `null` si no hay sesión. */
export const UsuarioAutenticadoOpcional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IdentidadAutenticada | null => {
    const request = ctx.switchToHttp().getRequest<{
      [IDENTIDAD_REQUEST_KEY]?: IdentidadAutenticada;
    }>();
    return request[IDENTIDAD_REQUEST_KEY] ?? null;
  },
);
