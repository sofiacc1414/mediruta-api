/** Panel admin — no existe ninguna cuenta con ese id. */
export class CuentaNoEncontradaError extends Error {
  constructor() {
    super('No se encontró esa cuenta.');
    this.name = 'CuentaNoEncontradaError';
  }
}
