import { SetMetadata } from '@nestjs/common';
import type { CodigoRol } from '../../domain/ports/usuario.repository.port';

export const ROLES_METADATA_KEY = 'roles';

/**
 * Restringe un endpoint a cuentas que tengan alguno de estos roles
 * habilitado (`usuario_roles.estado = 'habilitado'`) — lo interpreta
 * `RolesGuard`. Requiere `AccessAuthGuard` antes en la cadena de guards
 * (necesita `identidad.usuarioId` ya resuelto).
 */
export const Roles = (...roles: CodigoRol[]) =>
  SetMetadata(ROLES_METADATA_KEY, roles);
