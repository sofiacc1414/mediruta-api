import { Injectable } from '@nestjs/common';
import { DomiciliarioConPedidoActivoError } from '../../domain/errors/domiciliario-con-pedido-activo.error';
import { PedidoYaAsignadoError } from '../../domain/errors/pedido-ya-asignado.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_PEDIDO_ACEPTADO = 'Aceptaste el pedido — vas para la farmacia.';

/** HU-09 — el guard atómico de app.aceptar_pedido decide quién gana si
 * dos Domiciliarios aceptan casi al mismo tiempo. `ya_asignado` no es
 * un error de quien llamó — es el resultado normal de perder la
 * carrera. `ya_tiene_pedido_activo` sí es un bloqueo real: un
 * Domiciliario solo puede llevar un pedido a la vez. */
@Injectable()
export class AceptarPedidoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.aceptarPedido(
      domiciliarioId,
      solicitudId,
    );

    switch (resultado) {
      case 'aceptado':
        return { message: MENSAJE_PEDIDO_ACEPTADO };
      case 'ya_asignado':
        throw new PedidoYaAsignadoError();
      case 'ya_tiene_pedido_activo':
        throw new DomiciliarioConPedidoActivoError();
      case 'no_encontrado':
        throw new SolicitudNoEncontradaError();
    }
  }
}
