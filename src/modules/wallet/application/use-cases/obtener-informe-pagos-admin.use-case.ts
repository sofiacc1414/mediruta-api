import { Injectable } from '@nestjs/common';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { InformePagosAdmin } from '../../domain/wallet';

/** Módulo 3 — informe global tipo "Z" del panel admin: cuánto se le
 * debe en total a los domiciliarios (por pagar), cuánto deben ellos a
 * la empresa (por cobrar), y cuánto se saldó en el periodo elegido. */
@Injectable()
export class ObtenerInformePagosAdminUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  execute(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<InformePagosAdmin> {
    return this.wallet.obtenerInformePagosAdmin(adminId, desde, hasta);
  }
}
