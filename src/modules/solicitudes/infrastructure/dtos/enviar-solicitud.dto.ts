import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import type { MetodoPago } from '../../domain/ports/solicitud.repository.port';

/** Ver `VerificacionDireccionPrevia` en `EnviarSolicitudUseCase` —
 * opcional a propósito: si la App no la manda (o no coincide con el
 * texto actual), se geocodifica como siempre. */
export class EnviarSolicitudDto {
  @IsOptional()
  @IsString()
  direccionFarmaciaVerificadaPara?: string;

  /** Módulo 4 — App-anteriores no mandan esto: por defecto `efectivo`
   * (comportamiento idéntico al de antes de este módulo). */
  @IsOptional()
  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  metodoPago?: MetodoPago;

  /** Módulo 4 — solo si `metodoPago === 'tarjeta'`, simulado. */
  @IsOptional()
  @IsString()
  numeroTarjeta?: string;

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
