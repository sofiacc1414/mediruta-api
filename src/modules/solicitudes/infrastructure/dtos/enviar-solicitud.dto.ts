import { IsNumber, IsOptional, IsString } from 'class-validator';

/** Ver `VerificacionDireccionPrevia` en `EnviarSolicitudUseCase` —
 * opcional a propósito: si la App no la manda (o no coincide con el
 * texto actual), se geocodifica como siempre. */
export class EnviarSolicitudDto {
  @IsOptional()
  @IsString()
  direccionFarmaciaVerificadaPara?: string;

  @IsOptional()
  @IsNumber()
  farmaciaLat?: number;

  @IsOptional()
  @IsNumber()
  farmaciaLng?: number;

  @IsOptional()
  @IsString()
  direccionEntregaVerificadaPara?: string;

  @IsOptional()
  @IsNumber()
  entregaLat?: number;

  @IsOptional()
  @IsNumber()
  entregaLng?: number;
}
