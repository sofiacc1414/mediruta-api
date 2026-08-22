import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IniciarSesionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsEmail()
  @MaxLength(254)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
