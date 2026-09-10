import { IsInt, IsNumber, Max, Min } from 'class-validator';

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
}
