import { Injectable } from '@nestjs/common';
import {
  PedidoDisponible,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** HU-09 — pool de pedidos ordenados por distancia real a la farmacia,
 * usando la última ubicación guardada del Domiciliario. Vacío (no
 * error) si no está disponible o todavía no tiene ubicación — mismo
 * criterio que el resto de las listas del proyecto. */
@Injectable()
export class ListarPedidosDisponiblesUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(domiciliarioId: string): Promise<PedidoDisponible[]> {
    return this.solicitudes.listarPedidosDisponibles(domiciliarioId);
  }
}
