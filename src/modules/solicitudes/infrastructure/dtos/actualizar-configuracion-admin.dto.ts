import { IsBoolean, IsInt, IsNumber, Max, Min } from 'class-validator';

export class ActualizarConfiguracionAdminDto {
  @IsInt()
  @Min(1)
  @Max(1440)
  umbralMinutos: number;

  @IsNumber()
  @Min(0)
  tarifaBaseDomicilio: number;

  @IsNumber()
  @Min(0)
  tarifaPorKm: number;

  @IsNumber()
  @Min(0)
  tarifaPorMinuto: number;

  @IsInt()
  @Min(0)
  tiempoBaseFarmaciaMin: number;

  @IsNumber()
  @Min(0.1)
  velocidadPromedioKmh: number;

  @IsNumber()
  @Min(0)
  distanciaIncluidaKm: number;

  @IsNumber()
  @Min(0)
  tarifaPorKmExcedente: number;

  /** Módulo 4 — % (0-1) del costo del domicilio que retiene la app. */
  @IsNumber()
  @Min(0)
  @Max(1)
  comisionAppPorcentaje: number;

  /** Módulo 3 — deuda de efectivo a partir de la cual se bloquea al
   * Domiciliario para nuevos pedidos. */
  @IsNumber()
  @Min(0.01)
  topeRecaudoEfectivo: number;

  @IsBoolean()
  pagoEfectivoHabilitado: boolean;

  @IsBoolean()
  pagoTarjetaHabilitado: boolean;

  @IsBoolean()
  pagoTransferenciaHabilitado: boolean;
}
