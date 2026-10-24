import { Injectable } from '@nestjs/common';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';

/** Panel admin — columna "Pagado en el periodo" de la tabla de
 * billeteras: cuánto se le liquidó de saldo pendiente a cada
 * Domiciliario dentro del rango de fechas elegido. */
@Injectable()
export class ListarPagadoPeriodoAdminUseCase {
  constructor(private readonly wallet: WalletRepositoryPort) {}

  execute(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<Record<string, number>> {
    return this.wallet.listarPagadoPeriodoAdmin(adminId, desde, hasta);
  }
}
