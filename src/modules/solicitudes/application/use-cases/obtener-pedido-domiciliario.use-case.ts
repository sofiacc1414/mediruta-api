import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  EstadoSolicitud,
  EventoHistorial,
  NovedadDelPaciente,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type ObtenerPedidoDomiciliarioResultado = {
  id: string;
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
  historial: EventoHistorial[];
  novedadPropiaAbierta: NovedadDelPaciente | null;
};

/**
 * Ronda 11 — "Mis pedidos" del Domiciliario (tab Historial) era de solo
 * lectura sin detalle: tocar un pedido entregado/cancelado no llevaba a
 * ningún lado. Mismo shape que `ObtenerPedidoActivoUseCase`, pero por id
 * puntual y sin restricción de estado — cualquier pedido que ese
 * Domiciliario haya atendido alguna vez, no solo el que tiene en curso
 * ahora mismo. Lanza `SolicitudNoEncontradaError` (404) si el id no
 * existe o no es suyo, en vez de devolver `null` — acá sí hay una
 * expectativa de que el pedido exista (viene de tocar una fila de su
 * propia lista), a diferencia de "mi pedido activo" donde `null` es un
 * resultado normal (puede no tener ninguno en curso).
 */
@Injectable()
export class ObtenerPedidoDomiciliarioUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ObtenerPedidoDomiciliarioResultado> {
    const pedido = await this.solicitudes.obtenerPedidoPorId(
      domiciliarioId,
      solicitudId,
    );
    if (!pedido) {
      throw new SolicitudNoEncontradaError();
    }

    const [historial, novedadPropiaAbierta] = await Promise.all([
      this.solicitudes.listarHistorialPedidoActivo(domiciliarioId, pedido.id),
      this.solicitudes.obtenerNovedadPropiaAbierta(domiciliarioId, pedido.id),
    ]);

    return { ...pedido, historial, novedadPropiaAbierta };
  }
}
