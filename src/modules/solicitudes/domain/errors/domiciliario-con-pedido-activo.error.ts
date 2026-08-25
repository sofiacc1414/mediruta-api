/** HU-09 — un Domiciliario solo puede tener un pedido activo a la vez
 * (aceptado y todavía no entregado/cancelado). No puede aceptar otro
 * hasta terminar el actual — evita que se sature o deje uno colgado
 * por tomar otro. */
export class DomiciliarioConPedidoActivoError extends Error {
  constructor() {
    super('Ya tenés un pedido activo — entregalo antes de aceptar otro.');
    this.name = 'DomiciliarioConPedidoActivoError';
  }
}
