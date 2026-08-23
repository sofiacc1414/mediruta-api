import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const TELEFONO_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export class ActualizarDatosComunesDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombreCompleto: string;

  @IsString()
  @Matches(TELEFONO_PATTERN, {
    message:
      'El teléfono debe tener entre 7 y 20 caracteres (dígitos, espacios, +, -, paréntesis).',
  })
  telefono: string;
}
