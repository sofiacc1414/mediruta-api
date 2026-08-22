import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { TipoRegistro } from '../../domain/value-objects/tipo-registro';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class RegistrarUsuarioDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, {
    message:
      'La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un carácter especial.',
  })
  password: string;

  @IsEnum(TipoRegistro, {
    message: 'El tipo de registro solo puede ser PACIENTE o DOMICILIARIO.',
  })
  tipoRegistro: TipoRegistro;
}
