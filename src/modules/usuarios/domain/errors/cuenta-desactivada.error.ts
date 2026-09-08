/** Login con credenciales correctas pero la cuenta está en
 * `estado_cuenta = 'desactivada'` (autoservicio, HU-05) — a diferencia
 * de `CredencialesInvalidasError` (que cubre tanto contraseña
 * incorrecta como cuenta bloqueada/desactivada indistintamente, para
 * no filtrarle nada a quien todavía no probó la contraseña correcta),
 * este solo se lanza cuando la contraseña ya coincidió: en ese punto
 * no hay nada que ocultar sobre el estado de la cuenta, y distinguirlo
 * le permite a la App ofrecer reactivarla en vez de un error genérico. */
export class CuentaDesactivadaError extends Error {
  constructor() {
    super('Tu cuenta está desactivada.');
    this.name = 'CuentaDesactivadaError';
  }
}
