import { Injectable } from '@nestjs/common';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { WalletDomiciliarioPeriodo } from '../../domain/wallet';

/** Módulo 3 — balance del Domiciliario recalculado para un rango de
 * fechas puntual (no es el acumulado histórico de `ObtenerWalletUseCase`):
 * cuánto generó en efectivo (ya cobrado), cuánto generó en tarjeta/
 * transferencia (pendiente de que la empresa se lo liquide), y el
 * balance neto del periodo. */
@Injectable()
export class ObtenerWalletPeriodoUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  execute(
    domiciliarioId: string,
    desde: string,
    hasta: string,
  ): Promise<WalletDomiciliarioPeriodo> {
    return this.wallet.obtenerWalletPeriodo(domiciliarioId, desde, hasta);
  }
}
