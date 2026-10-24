export type ResultadoPagoTransferencia = 'aprobado' | 'rechazado';

/** Módulo 4 — pasarela de pagos SIMULADA (no hay integración real con
 * ningún procesador). Se resuelve en TS antes de llamar a
 * `app.enviar_solicitud` — si se rechaza, la solicitud ni siquiera
 * llega a la base de datos (sigue en `borrador`, el Paciente puede
 * reintentar con otro medio de pago sin perder el resto del pedido).
 * Mismo patrón que `PagoTarjetaPort`. */
export abstract class PagoTransferenciaPort {
  abstract procesar(monto: number): Promise<ResultadoPagoTransferencia>;
}
