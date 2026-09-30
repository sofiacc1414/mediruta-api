import { MensajeChat } from './chat.repository.port';

/** Mismo mecanismo que `EventosTiempoRealPort` (ver ese archivo) — el
 * REST (`ChatController.enviar`) y el WebSocket (`ChatGateway`) pasan
 * los dos por `EnviarMensajeChatUseCase`, así que el broadcast a la
 * room vive acá, una sola vez, sin importar qué canal originó el
 * envío. Bug real reportado: enviar por los dos canales a la vez
 * (REST + emit por WS) duplicaba el mensaje en la base — la solución
 * es que solo UNO persista, y que ese persista siempre transmita. */
export abstract class ChatEventosPort {
  abstract emitirNuevoMensaje(chatId: string, mensaje: MensajeChat): void;
}
