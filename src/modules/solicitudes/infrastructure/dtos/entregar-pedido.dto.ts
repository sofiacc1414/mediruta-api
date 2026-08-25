import { IsString, Matches } from 'class-validator';

export class EntregarPedidoDto {
  /** 6 caracteres alfanuméricos — misma validación de forma que ya
   * aplica `app.entregar_pedido` (el charset exacto sin 0/O/1/I/L es
   * un detalle de generación, no hace falta replicarlo acá; el
   * matcheo real y case-insensitive lo hace la base). */
  @IsString()
  @Matches(/^[A-Za-z0-9]{6}$/, {
    message: 'El código de entrega debe tener 6 caracteres alfanuméricos.',
  })
  codigo: string;
}
