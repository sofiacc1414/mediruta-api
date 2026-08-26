import { Injectable } from '@nestjs/common';
import {
  PedidoHistorialDomiciliario,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/**
 * "Mis pedidos" del lado Domiciliario — todos los pedidos que aceptó
 * alguna vez (en curso, entregados o cancelados), más reciente
 * primero. Mismo criterio que ListarSolicitudesUseCase del Paciente:
 * la API devuelve todo, el filtro por estado lo hace la UI.
 */
@Injectable()
export class ListarHistorialPedidosUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(domiciliarioId: string): Promise<PedidoHistorialDomiciliario[]> {
    return this.solicitudes.listarHistorialPedidos(domiciliarioId);
  }
}
