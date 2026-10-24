import { Injectable } from '@nestjs/common';
import { ResultadoLiquidacionLote, TipoLiquidacion } from '../../domain/wallet';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';

/** Módulo 3 — liquida deuda de efectivo o saldo pendiente de varios
 * Domiciliarios de una sola vez (pedido explícito: "liquidar en
 * lote"). No lanza error por filas individuales sin nada que liquidar
 * — esas vuelven con `resultado: 'sin_deuda'/'sin_saldo'` en vez de
 * interrumpir el resto del lote. */
@Injectable()
export class LiquidarLoteAdminUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  execute(
    adminId: string,
    tipo: TipoLiquidacion,
    domiciliarioIds: string[],
  ): Promise<ResultadoLiquidacionLote[]> {
    return this.wallet.liquidarLoteAdmin(adminId, tipo, domiciliarioIds);
  }
}
