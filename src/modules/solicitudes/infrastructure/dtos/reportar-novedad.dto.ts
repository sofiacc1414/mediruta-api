import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReportarNovedadDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  detalle: string;
}
