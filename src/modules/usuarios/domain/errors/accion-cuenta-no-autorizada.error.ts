/** Panel admin — solo ROOT puede bloquear/desbloquear una cuenta
 * ADMINISTRADOR o ROOT (un Administrador solo puede actuar sobre
 * cuentas Paciente/Domiciliario). */
export class AccionCuentaNoAutorizadaError extends Error {
  constructor() {
    super('No tenés permiso para hacer esa acción sobre esta cuenta.');
    this.name = 'AccionCuentaNoAutorizadaError';
  }
}
