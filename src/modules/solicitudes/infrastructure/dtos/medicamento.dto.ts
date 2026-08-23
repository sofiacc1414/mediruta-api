import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Una línea de medicamento dentro de una solicitud — una fórmula
 * puede traer varios. Todos opcionales a propósito: un Borrador puede
 * tener una línea a medio llenar. */
export class MedicamentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  concentracion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  formaFarmaceutica?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cantidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  posologia?: string;
}
