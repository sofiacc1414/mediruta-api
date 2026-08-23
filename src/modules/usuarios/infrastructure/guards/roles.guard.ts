import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import {
  IDENTIDAD_REQUEST_KEY,
  IdentidadAutenticada,
} from '../../domain/identidad-autenticada';
import {
  CodigoRol,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';

/**
 * Se ejecuta después de `AccessAuthGuard` (necesita
 * `identidad.usuarioId` ya en el request). Lee los roles pedidos con
 * `@Roles(...)` y aprueba solo si la cuenta tiene alguno de ellos
 * habilitado — reutiliza `UsuarioRepositoryPort.obtenerRoles()`, ya
 * usado por HU-02, sin agregar una consulta nueva a la BD.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usuarios: UsuarioRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // getAllAndOverride (no `get`): `@Roles(...)` en este controller está
    // puesto a nivel de clase, no de método — `get(key, context.getHandler())`
    // solo mira el método y nunca encuentra la metadata puesta en la
    // clase, dejando pasar a cualquiera sin importar su rol. Se detectó
    // probando en vivo: una cuenta sin rol ADMINISTRADOR/ROOT pasaba el
    // guard igual.
    const rolesRequeridos = this.reflector.getAllAndOverride<CodigoRol[] | undefined>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ [IDENTIDAD_REQUEST_KEY]?: IdentidadAutenticada }>();
    const identidad = request[IDENTIDAD_REQUEST_KEY];
    if (!identidad?.usuarioId) {
      throw new RolNoAutorizadoError();
    }

    const roles = await this.usuarios.obtenerRoles(identidad.usuarioId);
    const autorizado = roles.some(
      (rol) =>
        rolesRequeridos.includes(rol.codigo) && rol.estado === 'habilitado',
    );
    if (!autorizado) {
      throw new RolNoAutorizadoError();
    }

    return true;
  }
}
