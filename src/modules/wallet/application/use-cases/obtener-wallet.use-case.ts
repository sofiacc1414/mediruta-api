import { Injectable } from '@nestjs/common';
import { WalletNoEncontradaError } from '../../domain/errors/wallet-no-encontrada.error';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { WalletDomiciliario } from '../../domain/wallet';

/** Módulo 3 — el Domiciliario ve su propio saldo y deuda. Nunca
 * `null` para un Domiciliario con rol válido: `obtener_wallet_domiciliario`
 * siempre devuelve fila (con ceros) aunque todavía no haya entregado
 * nada — `null` solo significa que el usuario no es Domiciliario. */
@Injectable()
export class ObtenerWalletUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  async execute(domiciliarioId: string): Promise<WalletDomiciliario> {
    const resultado = await this.wallet.obtenerWallet(domiciliarioId);
    if (!resultado) {
      throw new WalletNoEncontradaError();
    }
    return resultado;
  }
}
