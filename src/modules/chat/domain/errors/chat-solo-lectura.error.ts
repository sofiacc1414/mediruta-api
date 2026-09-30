/** Pasaron 30 minutos desde que el pedido quedó `entregado`/`cancelada`
 * — el chat sigue visible en el historial pero no acepta mensajes
 * nuevos. */
export class ChatSoloLecturaError extends Error {
  constructor() {
    super('Este chat ya no acepta mensajes nuevos.');
    this.name = 'ChatSoloLecturaError';
  }
}
