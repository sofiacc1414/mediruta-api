import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from './politica-contrasena';

/** Solo ROOT puede crear cuentas ADMINISTRADOR (ver `@Roles('ROOT')` en
 * `UsuariosAdminController.crear`) — nunca es registro público, a
 * diferencia de PACIENTE/DOMICILIARIO. */
export class CrearAdministradorDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, {
    message: PASSWORD_PATTERN_MESSAGE,
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;
}
