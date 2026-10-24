/** El Domiciliario no tiene billetera (no ha entregado ningún pedido
 * todavía) o no existe con ese id. */
export class WalletNoEncontradaError extends Error {
  constructor() {
    super('No se encontró la billetera de ese domiciliario.');
    this.name = 'WalletNoEncontradaError';
  }
}
