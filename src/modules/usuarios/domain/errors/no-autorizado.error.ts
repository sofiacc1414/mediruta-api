export class NoAutorizadoError extends Error {
  constructor() {
    super('No autorizado.');
    this.name = 'NoAutorizadoError';
  }
}
