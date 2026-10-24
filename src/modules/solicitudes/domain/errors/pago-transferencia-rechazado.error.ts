/** Módulo 4 — la pasarela simulada rechazó la transferencia. Hoy nunca
 * se dispara (`SimuladoPagoTransferenciaAdapter` siempre aprueba), pero
 * queda listo para cuando exista una pasarela real que sí pueda
 * rechazar. El Paciente podría reintentar con otro medio de pago; la
 * solicitud sigue en `borrador`, nada se pierde. */
export class PagoTransferenciaRechazadoError extends Error {
  constructor() {
    super(
      'El pago por transferencia fue rechazado. Intenta con otro medio de pago.',
    );
    this.name = 'PagoTransferenciaRechazadoError';
  }
}
