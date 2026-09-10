/**
 * Reemplaza el "esperar hasta el próximo poll" por un aviso
 * instantáneo — App y Web hacían poll fijo cada 15s
 * (PedidosDisponiblesScreen, MiPedidoActivoScreen,
 * SolicitudDetalleScreen, HomeScreen del lado App; PedidosTab del lado
 * Web) para enterarse de un cambio de estado hecho desde otro lado.
 * Con esto, la API avisa apenas pasa algo — el poll de 15s queda como
 * red de seguridad (si el socket se cae, igual refresca solo).
 *
 * El evento no lleva ningún dato del pedido en sí — es una señal de
 * "algo cambió, volvé a pedir lo tuyo" (cada cliente ya sabe qué pedir
 * y ese request ya pasa por la autorización normal de la API). Evita
 * duplicar acá la lógica de autorización/serialización de cada
 * pantalla.
 */
export abstract class EventosTiempoRealPort {
  abstract emitirPedidoActualizado(): void;
}
