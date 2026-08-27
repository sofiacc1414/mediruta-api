/** Panel admin — asignación manual: el domiciliario elegido ya no
 * está disponible (se desconectó, ya tiene un pedido activo, o dejó de
 * tener el rol) entre que el admin vio la lista de cercanos y confirmó
 * la asignación. */
export class DomiciliarioNoDisponibleParaAsignarError extends Error {
  constructor() {
    super('Ese domiciliario ya no está disponible — elegí otro de la lista.');
    this.name = 'DomiciliarioNoDisponibleParaAsignarError';
  }
}
