import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ReportarCodigoNoGeneradoDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detalle?: string;
}
