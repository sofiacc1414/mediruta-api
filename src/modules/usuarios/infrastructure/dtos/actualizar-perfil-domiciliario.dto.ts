import { IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarPerfilDomiciliarioDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  direccion: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  vehiculoTipo: string;

  @IsString()
  @MinLength(4)
  @MaxLength(12)
  vehiculoPlaca: string;
}
