/** Panel admin — no existe una cuenta ADMINISTRADOR con ese id. */
export class AdministradorNoEncontradoError extends Error {
  constructor() {
    super('No se encontró esa cuenta de administrador.');
    this.name = 'AdministradorNoEncontradoError';
  }
}
