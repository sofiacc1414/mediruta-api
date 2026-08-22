export class RefreshTokenInvalidoError extends Error {
  constructor() {
    super('La sesión no es válida o ha expirado.');
    this.name = 'RefreshTokenInvalidoError';
  }
}
