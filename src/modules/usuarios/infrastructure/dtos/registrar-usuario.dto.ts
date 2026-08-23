import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoRegistro } from '../../domain/value-objects/tipo-registro';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from './politica-contrasena';

export class RegistrarUsuarioDto {
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

  @IsEnum(TipoRegistro, {
    message: 'El tipo de registro solo puede ser PACIENTE o DOMICILIARIO.',
  })
  tipoRegistro: TipoRegistro;

  /** Solo tiene efecto cuando `tipoRegistro = DOMICILIARIO` — si es
   * PACIENTE, ese rol se otorga siempre (es el propio rol elegido).
   * Opt-in a propósito (default `false` si no se manda): no todos los
   * domiciliarios van a querer ser también pacientes. */
  @IsOptional()
  @IsBoolean()
  altaPaciente?: boolean;
}
