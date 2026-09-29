import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GuardarCalificacionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comentario?: string;
}
