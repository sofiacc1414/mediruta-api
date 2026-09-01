/** HU-09 — el Domiciliario no puede apagar "Disponible para recibir
 * pedidos" mientras tiene un pedido activo en curso (uno de los 4
 * estados activos, ver `SolicitudRepositoryPort.obtenerPedidoActivo`)
 * — evita dejarlo colgado sin nadie que pueda reasignarlo. */
export class NoPuedeDesconectarseConPedidoActivoError extends Error {
  constructor() {
    super(
      'No podés desconectarte mientras tenés un pedido activo — entregalo o reportá una novedad primero.',
    );
    this.name = 'NoPuedeDesconectarseConPedidoActivoError';
  }
}
