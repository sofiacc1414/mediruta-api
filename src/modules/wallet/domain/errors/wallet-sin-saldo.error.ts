/** El admin intentó liquidar el saldo pendiente de un Domiciliario que
 * no tiene nada por cobrarle a la empresa (saldo_disponible <= 0). */
export class WalletSinSaldoError extends Error {
  constructor() {
    super('Ese domiciliario no tiene saldo pendiente por liquidar.');
    this.name = 'WalletSinSaldoError';
  }
}
