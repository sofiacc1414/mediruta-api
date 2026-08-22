export class RecuperacionInvalidaError extends Error {
  constructor() {
    super('El código de recuperación no es válido o ya no está disponible.');
    this.name = 'RecuperacionInvalidaError';
  }
}
