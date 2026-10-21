/** El id de farmacia aliada que mandó el admin no existe — pudo
 * cambiar o borrarse entre que se cargó la pantalla y se envió el
 * formulario. */
export class FarmaciaAliadaNoEncontradaError extends Error {
  constructor() {
    super('La farmacia aliada elegida ya no existe.');
    this.name = 'FarmaciaAliadaNoEncontradaError';
  }
}
