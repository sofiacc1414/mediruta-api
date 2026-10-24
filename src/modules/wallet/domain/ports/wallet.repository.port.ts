import {
  InformePagosAdmin,
  ResultadoLiquidacionLote,
  TipoLiquidacion,
  WalletAdmin,
  WalletDomiciliario,
  WalletDomiciliarioPeriodo,
} from '../wallet';

export type ResultadoLiquidarDeudaAdmin =
  'liquidado' | 'sin_deuda' | 'no_encontrado' | 'no_autorizado';

export type ResultadoLiquidarSaldoAdmin =
  'liquidado' | 'sin_saldo' | 'no_encontrado' | 'no_autorizado';

export abstract class WalletRepositoryPort {
  /** Billetera propia del Domiciliario autenticado (acumulado histórico). */
  abstract obtenerWallet(
    domiciliarioId: string,
  ): Promise<WalletDomiciliario | null>;

  /** Balance recalculado para un rango de fechas puntual. */
  abstract obtenerWalletPeriodo(
    domiciliarioId: string,
    desde: string,
    hasta: string,
  ): Promise<WalletDomiciliarioPeriodo>;

  /** Panel admin — todas las billeteras, lo que más se debe primero. */
  abstract listarWalletsAdmin(adminId: string): Promise<WalletAdmin[]>;

  /** CA3 — el admin confirma que el Domiciliario consignó la deuda de
   * efectivo completa: la deuda vuelve a $0 y se desbloquea. */
  abstract liquidarDeudaAdmin(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ResultadoLiquidarDeudaAdmin>;

  /** El admin le paga al Domiciliario lo que la empresa le debe de
   * tarjeta/transferencia: el saldo pendiente vuelve a $0 y pasa a
   * `saldoCobrado`. */
  abstract liquidarSaldoAdmin(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ResultadoLiquidarSaldoAdmin>;

  /** Misma acción (deuda o saldo) para varios Domiciliarios de una. */
  abstract liquidarLoteAdmin(
    adminId: string,
    tipo: TipoLiquidacion,
    domiciliarioIds: string[],
  ): Promise<ResultadoLiquidacionLote[]>;

  /** Informe global tipo "Z" del panel admin. */
  abstract obtenerInformePagosAdmin(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<InformePagosAdmin>;

  /** Cuánto se le liquidó de saldo pendiente a cada Domiciliario dentro
   * del rango de fechas — lo que incrementó su `saldoCobrado` en ese
   * periodo (columna "Pagado en el periodo" del panel admin). */
  abstract listarPagadoPeriodoAdmin(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<Record<string, number>>;
}
