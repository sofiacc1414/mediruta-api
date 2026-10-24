import {
  DetalleComportamientoDomiciliario,
  ResumenComportamientoDomiciliario,
} from '../comportamiento-domiciliario';

export abstract class ComportamientoDomiciliarioRepositoryPort {
  /** G01/G03 — todos los domiciliarios habilitados, recalculado para
   * el rango de fechas pedido. */
  abstract listarResumen(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenComportamientoDomiciliario[]>;

  /** G02 — `null` si `domiciliarioId` no existe o no tiene el rol
   * DOMICILIARIO habilitado (404 del controller) — distinto de G05
   * (domiciliario real, sin actividad en el periodo: devuelve un
   * resumen con todo en cero, no `null`). */
  abstract obtenerDetalle(
    adminId: string,
    domiciliarioId: string,
    desde: string,
    hasta: string,
  ): Promise<DetalleComportamientoDomiciliario | null>;
}
