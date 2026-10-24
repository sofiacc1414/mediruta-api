/** Módulo 4 — el admin deshabilitó ese medio de pago (toggle del panel
 * admin, `configuracion_admin.pago_*_habilitado`). */
export class MedioPagoNoHabilitadoError extends Error {
  constructor() {
    super('Ese medio de pago no está disponible por ahora.');
    this.name = 'MedioPagoNoHabilitadoError';
  }
}
