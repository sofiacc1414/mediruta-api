/** El domiciliario intentó mandar una posición en vivo para un pedido
 * que no está `en_camino_entrega` (todavía no llegó a ese paso, o ya
 * se entregó/canceló). */
export class PedidoNoEnCaminoError extends Error {
  constructor() {
    super('Este pedido no está en camino de entrega en este momento.');
    this.name = 'PedidoNoEnCaminoError';
  }
}
