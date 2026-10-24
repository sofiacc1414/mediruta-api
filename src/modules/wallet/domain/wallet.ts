/** Módulo 3 — billetera del Domiciliario.
 *
 * `saldoCobrado` es lo que el Domiciliario YA tiene en mano: ganancia
 * neta de pedidos en efectivo (siempre en su bolsillo de inmediato,
 * aparte de lo que debe devolver como `deudaEfectivo`) + lo que ya le
 * liquidó el admin de tarjeta/transferencia.
 *
 * `saldoPendienteCobrar` es tarjeta/transferencia ya cobrado por la
 * EMPRESA pero todavía no pagado al Domiciliario — es plata que la
 * empresa le debe, no plata que él ya tiene (nombre de columna en la
 * base sigue siendo `saldo_disponible` por compatibilidad, pero el
 * significado real es "pendiente de que la empresa lo liquide").
 *
 * `deudaEfectivo` es lo que el Domiciliario le debe a la empresa por
 * haber cobrado en efectivo (sin cambios respecto al diseño original).
 *
 * `comisionAcumulada` es el total histórico bruto generado por todos
 * los domicilios entregados (informativo, no es plata disponible). */
export type WalletDomiciliario = {
  comisionAcumulada: number;
  saldoCobrado: number;
  saldoPendienteCobrar: number;
  deudaEfectivo: number;
  bloqueadoPorTope: boolean;
  topeRecaudoEfectivo: number;
};

/** Módulo 3 — fila de la billetera de un Domiciliario tal como la ve
 * el admin en el listado. */
export type WalletAdmin = {
  domiciliarioId: string;
  correo: string;
  comisionAcumulada: number;
  saldoCobrado: number;
  saldoPendienteCobrar: number;
  deudaEfectivo: number;
  bloqueadoPorTope: boolean;
};

/** Balance recalculado para un rango de fechas puntual (no es un
 * acumulado histórico) — "neto ganado en ese rango", generado por
 * entregas de ambos métodos, sin importar si ya se liquidó. */
export type WalletDomiciliarioPeriodo = {
  cobradoEfectivoPeriodo: number;
  pendienteTarjetaTransferenciaPeriodo: number;
  deudaGeneradaEfectivoPeriodo: number;
  liquidadoEnPeriodo: number;
  balancePeriodo: number;
};

/** Informe global tipo "Z" para el panel admin — snapshot actual de lo
 * pendiente (por pagar/por cobrar) + lo saldado en el periodo elegido. */
export type InformePagosAdmin = {
  totalPorPagar: number;
  totalPorCobrar: number;
  totalLiquidadoPagosPeriodo: number;
  totalLiquidadoDeudasPeriodo: number;
  /** Comisión que se queda MediRuta de los domicilios entregados en el
   * periodo (`domicilio_cobrado * comision_app_porcentaje_cobrada`) —
   * no es plata de ningún domiciliario, es el ingreso propio. */
  totalIngresosEmpresaPeriodo: number;
  domiciliariosBloqueados: number;
  domiciliariosConSaldoPendiente: number;
};

export type TipoLiquidacion = 'deuda_efectivo' | 'saldo_pendiente';

export type ResultadoLiquidacionLote = {
  domiciliarioId: string;
  montoLiquidado: number;
  resultado: 'liquidado' | 'sin_deuda' | 'sin_saldo' | 'no_encontrado';
};
