import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { WalletNoEncontradaError } from '../../domain/errors/wallet-no-encontrada.error';
import { WalletSinSaldoError } from '../../domain/errors/wallet-sin-saldo.error';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';

export const MENSAJE_SALDO_LIQUIDADO =
  'Se registró el pago. El saldo pendiente del domiciliario quedó en $0.';

export type LiquidarSaldoAdminResultado = { message: string };

/** Módulo 3 — el admin confirma que le pagó al Domiciliario lo que la
 * empresa le debía por tarjeta/transferencia: el saldo pendiente vuelve
 * a $0 y pasa a `saldoCobrado`. Queda registrado en
 * `liquidacion_domiciliario` (tipo `saldo_pendiente`). */
@Injectable()
export class LiquidarSaldoAdminUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  async execute(
    adminId: string,
    domiciliarioId: string,
  ): Promise<LiquidarSaldoAdminResultado> {
    const resultado = await this.wallet.liquidarSaldoAdmin(
      adminId,
      domiciliarioId,
    );

    switch (resultado) {
      case 'liquidado':
        return { message: MENSAJE_SALDO_LIQUIDADO };
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'no_encontrado':
        throw new WalletNoEncontradaError();
      case 'sin_saldo':
        throw new WalletSinSaldoError();
    }
  }
}
