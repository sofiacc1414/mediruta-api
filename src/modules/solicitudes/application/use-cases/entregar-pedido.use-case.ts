import { Injectable } from '@nestjs/common';
import { CodigoEntregaIncorrectoError } from '../../domain/errors/codigo-entrega-incorrecto.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_PEDIDO_ENTREGADO = '¡Pedido entregado!';

/** HU-07 — cierra el pedido, pero solo si el código de 6 que dice el
 * paciente coincide con el que se generó al enviar la solicitud
 * (validado en la base, case-insensitive). */
@Injectable()
export class EntregarPedidoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
    codigo: string,
  ): Promise<{ message: string }> {
    const resultado = await this.solicitudes.entregarPedido(
      domiciliarioId,
      solicitudId,
      codigo,
    );

    switch (resultado) {
      case 'entregado':
        return { message: MENSAJE_PEDIDO_ENTREGADO };
      case 'codigo_incorrecto':
        throw new CodigoEntregaIncorrectoError();
      case 'no_encontrado':
        throw new SolicitudNoEncontradaError();
    }
  }
}
