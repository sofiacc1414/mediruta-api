/** HU-07 — no existe esa novedad, o ya estaba resuelta. */
export class NovedadNoEncontradaError extends Error {
  constructor() {
    super('No se encontró la novedad, o ya estaba resuelta.');
    this.name = 'NovedadNoEncontradaError';
  }
}
