/** El domiciliario intentó mandar una posición en vivo para un pedido
 * fuera de la ventana de tracking (desde que acepta hasta entregar:
 * `asignado_en_camino_farmacia`...`en_sitio`), o ya entregado/cancelado. */
export class PedidoNoEnCaminoError extends Error {
  constructor() {
    super('Este pedido no está activo para seguimiento en este momento.');
    this.name = 'PedidoNoEnCaminoError';
  }
}
