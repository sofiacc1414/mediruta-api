import { Injectable } from '@nestjs/common';
import { ComportamientoDomiciliarioRepositoryPort } from '../../domain/ports/comportamiento-domiciliario.repository.port';
import { DetalleComportamientoDomiciliario } from '../../domain/comportamiento-domiciliario';

/** G02 — detalle de un domiciliario puntual: su resumen + línea de
 * tiempo de eventos del periodo. `null` si no existe o no tiene el
 * rol DOMICILIARIO habilitado (el controller lo traduce a 404). */
@Injectable()
export class ObtenerDetalleComportamientoAdminUseCase {
  constructor(
    private readonly comportamiento: ComportamientoDomiciliarioRepositoryPort,
  ) {}

  execute(
    adminId: string,
    domiciliarioId: string,
    desde: string,
    hasta: string,
  ): Promise<DetalleComportamientoDomiciliario | null> {
    return this.comportamiento.obtenerDetalle(
      adminId,
      domiciliarioId,
      desde,
      hasta,
    );
  }
}
