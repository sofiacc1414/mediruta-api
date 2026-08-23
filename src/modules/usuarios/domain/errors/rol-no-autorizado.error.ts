export class RolNoAutorizadoError extends Error {
  constructor() {
    super('Tu cuenta no tiene ese rol asignado.');
    this.name = 'RolNoAutorizadoError';
  }
}
