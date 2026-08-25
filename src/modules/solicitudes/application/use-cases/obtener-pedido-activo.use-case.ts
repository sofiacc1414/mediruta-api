import { Injectable } from '@nestjs/common';
import {
  EstadoSolicitud,
  EventoHistorial,
  NovedadDelPaciente,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type ObtenerPedidoActivoResultado = {
  id: string;
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
  historial: EventoHistorial[];
  /** Si el propio Domiciliario ya reportó una novedad sobre este pedido
   * y sigue sin resolver — `null` si no hay ninguna. */
  novedadPropiaAbierta: NovedadDelPaciente | null;
} | null;

/**
 * HU-09/HU-07 — "Mi pedido activo": el pedido que el Domiciliario tiene
 * en curso ahora mismo, con su historial (para el mismo
 * `AppTrackingTimeline` que usa el Paciente). `null` si no tiene
 * ninguno — sin esto no había forma de recuperarlo tras cerrar y
 * reabrir la app (`ListarPedidosDisponiblesUseCase` deja de incluirlo
 * apenas lo acepta). A propósito no expone `codigoEntrega` — ver
 * comentario en el puerto.
 */
@Injectable()
export class ObtenerPedidoActivoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(domiciliarioId: string): Promise<ObtenerPedidoActivoResultado> {
    const pedido = await this.solicitudes.obtenerPedidoActivo(domiciliarioId);
    if (!pedido) {
      return null;
    }

    const [historial, novedadPropiaAbierta] = await Promise.all([
      this.solicitudes.listarHistorialPedidoActivo(domiciliarioId, pedido.id),
      this.solicitudes.obtenerNovedadPropiaAbierta(domiciliarioId, pedido.id),
    ]);

    return { ...pedido, historial, novedadPropiaAbierta };
  }
}
