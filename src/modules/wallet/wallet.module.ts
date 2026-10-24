import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ListarPagadoPeriodoAdminUseCase } from './application/use-cases/listar-pagado-periodo-admin.use-case';
import { ListarWalletsAdminUseCase } from './application/use-cases/listar-wallets-admin.use-case';
import { LiquidarDeudaAdminUseCase } from './application/use-cases/liquidar-deuda-admin.use-case';
import { LiquidarLoteAdminUseCase } from './application/use-cases/liquidar-lote-admin.use-case';
import { LiquidarSaldoAdminUseCase } from './application/use-cases/liquidar-saldo-admin.use-case';
import { ObtenerInformePagosAdminUseCase } from './application/use-cases/obtener-informe-pagos-admin.use-case';
import { ObtenerWalletPeriodoUseCase } from './application/use-cases/obtener-wallet-periodo.use-case';
import { ObtenerWalletUseCase } from './application/use-cases/obtener-wallet.use-case';
import { WalletRepositoryPort } from './domain/ports/wallet.repository.port';
import { PostgresWalletRepository } from './infrastructure/adapters/postgres-wallet.repository';
import { WalletAdminController } from './infrastructure/controllers/wallet-admin.controller';
import { WalletController } from './infrastructure/controllers/wallet.controller';

/** Módulo 3 (Billetera digital del Domiciliario) — saldo/deuda propios
 * (acumulado histórico y por periodo) y, del lado admin, el listado +
 * liquidación individual/en lote + informe global tipo "Z". El bloqueo
 * en sí (`bloqueado_por_tope`) vive en `SolicitudesModule`
 * (`app.aceptar_pedido`/`listar_pedidos_disponibles`), porque es ahí
 * donde se decide si el Domiciliario puede tomar un pedido — este
 * módulo solo lee/liquida la billetera. */
@Module({
  imports: [UsuariosModule],
  controllers: [WalletController, WalletAdminController],
  providers: [
    ObtenerWalletUseCase,
    ObtenerWalletPeriodoUseCase,
    ListarWalletsAdminUseCase,
    LiquidarDeudaAdminUseCase,
    LiquidarSaldoAdminUseCase,
    LiquidarLoteAdminUseCase,
    ObtenerInformePagosAdminUseCase,
    ListarPagadoPeriodoAdminUseCase,
    {
      provide: WalletRepositoryPort,
      useClass: PostgresWalletRepository,
    },
  ],
})
export class WalletModule {}
