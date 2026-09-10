import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Estimado en vivo (POST /solicitudes/estimar-precio) — a diferencia
 * de `DatosSolicitudDto`, acá ambas direcciones son obligatorias: sin
 * las dos no hay nada que geocodificar ni distancia que calcular. */
export class EstimarPrecioPedidoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccionFarmacia!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccionEntrega!: string;
}
