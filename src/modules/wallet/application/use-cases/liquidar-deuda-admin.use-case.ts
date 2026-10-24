import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { WalletNoEncontradaError } from '../../domain/errors/wallet-no-encontrada.error';
import { WalletSinDeudaError } from '../../domain/errors/wallet-sin-deuda.error';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';

export const MENSAJE_DEUDA_LIQUIDADA =
  'Se registró la liquidación. El domiciliario ya puede volver a aceptar pedidos.';

export type LiquidarDeudaAdminResultado = { message: string };

/** CA3 — el admin confirma que el Domiciliario le entregó en mano (o
 * consignó) la deuda de efectivo acumulada: la deuda vuelve a $0 y se
 * desbloquea para aceptar pedidos de nuevo. Queda un registro en
 * `liquidacion_domiciliario` (auditoría, quién aprobó y cuánto). */
@Injectable()
export class LiquidarDeudaAdminUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  async execute(
    adminId: string,
    domiciliarioId: string,
  ): Promise<LiquidarDeudaAdminResultado> {
    const resultado = await this.wallet.liquidarDeudaAdmin(
      adminId,
      domiciliarioId,
    );

    switch (resultado) {
      case 'liquidado':
        return { message: MENSAJE_DEUDA_LIQUIDADA };
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'no_encontrado':
        throw new WalletNoEncontradaError();
      case 'sin_deuda':
        throw new WalletSinDeudaError();
    }
  }
}
