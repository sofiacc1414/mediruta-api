/** El pedido existe y el usuario tiene permiso, pero no está en la
 * ventana de tracking (ni `en_camino_entrega`, ni recién entregado/
 * cancelado) — no hay nada que mostrar en el mapa todavía o ya no. */
export class TrackingNoDisponibleError extends Error {
  constructor() {
    super('El seguimiento en vivo no está disponible para este pedido en este momento.');
    this.name = 'TrackingNoDisponibleError';
  }
}
