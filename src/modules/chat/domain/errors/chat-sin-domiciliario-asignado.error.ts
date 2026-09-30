/** El pedido todavía no tiene Domiciliario asignado (sigue en el pool,
 * `en_asignacion`) — no hay con quién chatear todavía. */
export class ChatSinDomiciliarioAsignadoError extends Error {
  constructor() {
    super('Todavía no hay un domiciliario asignado a este pedido.');
    this.name = 'ChatSinDomiciliarioAsignadoError';
  }
}
