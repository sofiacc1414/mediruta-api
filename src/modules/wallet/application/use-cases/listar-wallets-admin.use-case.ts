import { Injectable } from '@nestjs/common';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { WalletAdmin } from '../../domain/wallet';

/** Panel admin — todas las billeteras, deuda más alta primero (ver
 * `app.listar_wallets_admin`), para priorizar a quién contactar por
 * efectivo pendiente de consignar. */
@Injectable()
export class ListarWalletsAdminUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  execute(adminId: string): Promise<WalletAdmin[]> {
    return this.wallet.listarWalletsAdmin(adminId);
  }
}
