import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type {
  CodigoRol,
  EstadoCuenta,
} from '../../domain/ports/usuario.repository.port';

const ROLES_VALIDOS: CodigoRol[] = [
  'PACIENTE',
  'DOMICILIARIO',
  'ADMINISTRADOR',
  'ROOT',
];
const ESTADOS_VALIDOS: EstadoCuenta[] = ['activa', 'bloqueada', 'desactivada'];

/** Panel admin — GET /admin/cuentas?rol=&estado=&busqueda=, todos
 * opcionales (sin filtro = todas las cuentas). */
export class FiltrarCuentasAdminDto {
  @IsOptional()
  @IsIn(ROLES_VALIDOS, {
    message: `rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}.`,
  })
  rol?: CodigoRol;

  @IsOptional()
  @IsIn(ESTADOS_VALIDOS, {
    message: `estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.`,
  })
  estado?: EstadoCuenta;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  busqueda?: string;
}
