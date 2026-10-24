/** Módulo 3 — la deuda de efectivo del Domiciliario alcanzó el tope
 * configurado (CA2): no puede aceptar más pedidos hasta que el admin
 * confirme que liquidó lo que debe (ver `wallet_domiciliario`). */
export class DomiciliarioBloqueadoPorTopeError extends Error {
  constructor() {
    super(
      'No puedes aceptar más pedidos: alcanzaste el tope de dinero recaudado en efectivo. Debes entregarlo a la empresa para que te desbloqueen.',
    );
    this.name = 'DomiciliarioBloqueadoPorTopeError';
  }
}
