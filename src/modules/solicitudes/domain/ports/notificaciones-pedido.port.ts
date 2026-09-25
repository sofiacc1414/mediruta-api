/** La capa de pedidos avisa acá cuando un cambio quedó confirmado.
 * La implementación vive en el módulo de notificaciones. */
export abstract class NotificacionesPedidoPort {
  abstract notificarPedido(solicitudId: string): Promise<void>;
}
