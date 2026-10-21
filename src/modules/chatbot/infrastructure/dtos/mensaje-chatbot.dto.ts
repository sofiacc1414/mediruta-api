import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class MensajeChatbotDto {
  @IsString()
  @MinLength(1)
  mensaje: string;

  @IsOptional()
  @IsString()
  eps?: string;

  @IsOptional()
  @IsIn(['contributivo', 'subsidiado'])
  regimen?: 'contributivo' | 'subsidiado';

  @IsOptional()
  @IsIn(['menos_2_smlv', 'entre_2_y_5_smlv', 'mas_5_smlv'])
  rangoIngresos?: 'menos_2_smlv' | 'entre_2_y_5_smlv' | 'mas_5_smlv';

  @IsOptional()
  @IsInt()
  @Min(0)
  intentosSinExitoSeguidos?: number;
}
