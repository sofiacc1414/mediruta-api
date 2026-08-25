/** HU-09 — dos Domiciliarios aceptaron el mismo pedido casi al mismo
 * tiempo; el guard atómico de `app.aceptar_pedido` solo deja pasar al
 * primero. No es un error del que lo llamó (no hizo nada mal), es el
 * caso normal de un pool competitivo — la App lo muestra como "ya lo
 * tomó otro domiciliario", no como una falla. */
export class PedidoYaAsignadoError extends Error {
  constructor() {
    super('Ese pedido ya fue asignado a otro domiciliario.');
    this.name = 'PedidoYaAsignadoError';
  }
}
