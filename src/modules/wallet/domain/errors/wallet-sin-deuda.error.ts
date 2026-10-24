/** CA3 — el admin intentó liquidar la deuda de un Domiciliario que no
 * debe nada (deuda_efectivo <= 0). No hay nada que liquidar. */
export class WalletSinDeudaError extends Error {
  constructor() {
    super('Ese domiciliario no tiene deuda pendiente por liquidar.');
    this.name = 'WalletSinDeudaError';
  }
}
