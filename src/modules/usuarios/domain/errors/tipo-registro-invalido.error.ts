export class TipoRegistroInvalidoError extends Error {
  constructor() {
    super('El tipo de registro no es válido.');
    this.name = 'TipoRegistroInvalidoError';
  }
}
