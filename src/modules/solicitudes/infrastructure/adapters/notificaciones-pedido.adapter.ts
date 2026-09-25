import { Injectable } from '@nestjs/common';
import { NotificarCambioPedidoUseCase } from '../../../notificaciones/application/use-cases/notificar-cambio-pedido.use-case';
import { NotificacionesPedidoPort } from '../../domain/ports/notificaciones-pedido.port';

@Injectable()
export class NotificacionesPedidoAdapter extends NotificacionesPedidoPort {
  constructor(private readonly notificar: NotificarCambioPedidoUseCase) {
    super();
  }

  notificarPedido(solicitudId: string): Promise<void> {
    return this.notificar.execute(solicitudId);
  }
}
