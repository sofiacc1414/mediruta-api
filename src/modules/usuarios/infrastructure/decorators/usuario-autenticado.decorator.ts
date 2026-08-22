import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import {
  IDENTIDAD_REQUEST_KEY,
  IdentidadAutenticada,
} from '../../domain/identidad-autenticada';

export const UsuarioAutenticado = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IdentidadAutenticada => {
    const request = ctx.switchToHttp().getRequest<{
      [IDENTIDAD_REQUEST_KEY]?: IdentidadAutenticada;
    }>();
    const identidad = request[IDENTIDAD_REQUEST_KEY];
    if (!identidad?.usuarioId || !identidad.sid) {
      throw new NoAutorizadoError();
    }
    return identidad;
  },
);
