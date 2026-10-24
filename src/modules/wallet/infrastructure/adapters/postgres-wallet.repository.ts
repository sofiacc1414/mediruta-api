import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  InformePagosAdmin,
  ResultadoLiquidacionLote,
  TipoLiquidacion,
  WalletAdmin,
  WalletDomiciliario,
  WalletDomiciliarioPeriodo,
} from '../../domain/wallet';
import {
  ResultadoLiquidarDeudaAdmin,
  ResultadoLiquidarSaldoAdmin,
  WalletRepositoryPort,
} from '../../domain/ports/wallet.repository.port';

type FilaWalletDomiciliario = {
  comision_acumulada: string;
  saldo_disponible: string;
  saldo_cobrado: string;
  deuda_efectivo: string;
  bloqueado_por_tope: boolean;
  tope_recaudo_efectivo: string;
};

type FilaWalletAdmin = {
  domiciliario_id: string;
  correo: string;
  comision_acumulada: string;
  saldo_disponible: string;
  saldo_cobrado: string;
  deuda_efectivo: string;
  bloqueado_por_tope: boolean;
};

type FilaWalletPeriodo = {
  cobrado_efectivo_periodo: string;
  pendiente_tarjeta_transferencia_periodo: string;
  deuda_generada_efectivo_periodo: string;
  liquidado_en_periodo: string;
  balance_periodo: string;
};

type FilaInformePagosAdmin = {
  total_por_pagar: string;
  total_por_cobrar: string;
  total_liquidado_pagos_periodo: string;
  total_liquidado_deudas_periodo: string;
  total_ingresos_empresa_periodo: string;
  domiciliarios_bloqueados: number;
  domiciliarios_con_saldo_pendiente: number;
};

type FilaLiquidacionLote = {
  domiciliario_id: string | null;
  monto_liquidado: string | null;
  resultado: string;
};

type FilaPagadoPeriodo = {
  domiciliario_id: string;
  pagado_en_periodo: string;
};

@Injectable()
export class PostgresWalletRepository extends WalletRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  obtenerWallet(domiciliarioId: string): Promise<WalletDomiciliario | null> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaWalletDomiciliario>(
        'select * from app.obtener_wallet_domiciliario($1)',
        [domiciliarioId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return {
        comisionAcumulada: Number(fila.comision_acumulada),
        saldoPendienteCobrar: Number(fila.saldo_disponible),
        saldoCobrado: Number(fila.saldo_cobrado),
        deudaEfectivo: Number(fila.deuda_efectivo),
        bloqueadoPorTope: fila.bloqueado_por_tope,
        topeRecaudoEfectivo: Number(fila.tope_recaudo_efectivo),
      };
    });
  }

  obtenerWalletPeriodo(
    domiciliarioId: string,
    desde: string,
    hasta: string,
  ): Promise<WalletDomiciliarioPeriodo> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaWalletPeriodo>(
        'select * from app.obtener_wallet_domiciliario_periodo($1, $2, $3)',
        [domiciliarioId, desde, hasta],
      );
      const fila = result.rows[0];
      return {
        cobradoEfectivoPeriodo: Number(fila.cobrado_efectivo_periodo),
        pendienteTarjetaTransferenciaPeriodo: Number(
          fila.pendiente_tarjeta_transferencia_periodo,
        ),
        deudaGeneradaEfectivoPeriodo: Number(
          fila.deuda_generada_efectivo_periodo,
        ),
        liquidadoEnPeriodo: Number(fila.liquidado_en_periodo),
        balancePeriodo: Number(fila.balance_periodo),
      };
    });
  }

  listarWalletsAdmin(adminId: string): Promise<WalletAdmin[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaWalletAdmin>(
        'select * from app.listar_wallets_admin($1)',
        [adminId],
      );
      return result.rows.map((fila) => ({
        domiciliarioId: fila.domiciliario_id,
        correo: fila.correo,
        comisionAcumulada: Number(fila.comision_acumulada),
        saldoPendienteCobrar: Number(fila.saldo_disponible),
        saldoCobrado: Number(fila.saldo_cobrado),
        deudaEfectivo: Number(fila.deuda_efectivo),
        bloqueadoPorTope: fila.bloqueado_por_tope,
      }));
    });
  }

  liquidarDeudaAdmin(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ResultadoLiquidarDeudaAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoLiquidarDeudaAdmin;
      }>('select * from app.liquidar_deuda_domiciliario_admin($1, $2)', [
        adminId,
        domiciliarioId,
      ]);
      return result.rows[0].resultado;
    });
  }

  liquidarSaldoAdmin(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ResultadoLiquidarSaldoAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoLiquidarSaldoAdmin;
      }>('select * from app.liquidar_saldo_domiciliario_admin($1, $2)', [
        adminId,
        domiciliarioId,
      ]);
      return result.rows[0].resultado;
    });
  }

  liquidarLoteAdmin(
    adminId: string,
    tipo: TipoLiquidacion,
    domiciliarioIds: string[],
  ): Promise<ResultadoLiquidacionLote[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaLiquidacionLote>(
        'select * from app.liquidar_lote_admin($1, $2, $3::uuid[])',
        [adminId, tipo, domiciliarioIds],
      );
      return result.rows
        .filter((fila) => fila.domiciliario_id !== null)
        .map((fila) => ({
          domiciliarioId: fila.domiciliario_id as string,
          montoLiquidado: Number(fila.monto_liquidado ?? 0),
          resultado: fila.resultado as ResultadoLiquidacionLote['resultado'],
        }));
    });
  }

  obtenerInformePagosAdmin(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<InformePagosAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaInformePagosAdmin>(
        'select * from app.obtener_informe_pagos_admin($1, $2, $3)',
        [adminId, desde, hasta],
      );
      const fila = result.rows[0];
      return {
        totalPorPagar: Number(fila.total_por_pagar),
        totalPorCobrar: Number(fila.total_por_cobrar),
        totalLiquidadoPagosPeriodo: Number(fila.total_liquidado_pagos_periodo),
        totalLiquidadoDeudasPeriodo: Number(
          fila.total_liquidado_deudas_periodo,
        ),
        totalIngresosEmpresaPeriodo: Number(
          fila.total_ingresos_empresa_periodo,
        ),
        domiciliariosBloqueados: fila.domiciliarios_bloqueados,
        domiciliariosConSaldoPendiente: fila.domiciliarios_con_saldo_pendiente,
      };
    });
  }

  listarPagadoPeriodoAdmin(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<Record<string, number>> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaPagadoPeriodo>(
        'select * from app.listar_pagado_periodo_admin($1, $2, $3)',
        [adminId, desde, hasta],
      );
      const porDomiciliario: Record<string, number> = {};
      for (const fila of result.rows) {
        porDomiciliario[fila.domiciliario_id] = Number(fila.pagado_en_periodo);
      }
      return porDomiciliario;
    });
  }
}
