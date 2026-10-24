/** Módulo 4 — la pasarela simulada rechazó la tarjeta. El Paciente
 * puede reintentar con otro número u otro medio de pago; la solicitud
 * sigue en `borrador`, nada se pierde. */
export class PagoTarjetaRechazadoError extends Error {
  constructor() {
    super(
      'El pago con tarjeta fue rechazado. Intenta con otra tarjeta u otro medio de pago.',
    );
    this.name = 'PagoTarjetaRechazadoError';
  }
}
