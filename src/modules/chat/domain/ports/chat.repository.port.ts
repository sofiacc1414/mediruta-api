export type RolRemitenteChat = 'PACIENTE' | 'DOMICILIARIO';

export type ChatPedido = {
  chatId: string;
  soloLectura: boolean;
};

export type MensajeChat = {
  id: string;
  chatId: string;
  remitenteId: string;
  rolRemitente: RolRemitenteChat;
  contenido: string;
  creadoEn: string;
  leidoEn: string | null;
};

/** Resultado discriminado de `app.obtener_o_crear_chat_pedido` — mismo
 * criterio que el resto del proyecto (ver `crear_solicitud`, etc.):
 * nunca lanza desde SQL, devuelve un `resultado` que la capa TS
 * traduce a un error de dominio o a un valor. */
export type ResultadoObtenerChat =
  | { resultado: 'ok'; chat: ChatPedido }
  | { resultado: 'no_autorizado' }
  | { resultado: 'pedido_no_encontrado' }
  | { resultado: 'sin_domiciliario_asignado' };

export type ResultadoEnviarMensaje =
  | {
      resultado: 'ok';
      mensaje: MensajeChat;
      destinatarioId: string;
      solicitudId: string;
    }
  | { resultado: 'no_autorizado' }
  | { resultado: 'chat_no_encontrado' }
  | { resultado: 'chat_solo_lectura' }
  | { resultado: 'contenido_vacio' };

export abstract class ChatRepositoryPort {
  abstract obtenerOCrearChat(
    usuarioId: string,
    solicitudId: string,
  ): Promise<ResultadoObtenerChat>;

  abstract enviarMensaje(
    usuarioId: string,
    chatId: string,
    contenido: string,
  ): Promise<ResultadoEnviarMensaje>;

  /** Lista vacía si no hay mensajes TODAVÍA o si `usuarioId` no es
   * parte de ese chat — el controller siempre valida ownership antes
   * (vía `ObtenerChatPedidoUseCase`), así que acá no hace falta
   * distinguir los dos casos. */
  abstract listarMensajes(
    usuarioId: string,
    chatId: string,
  ): Promise<MensajeChat[]>;

  abstract marcarMensajesLeidos(
    usuarioId: string,
    chatId: string,
  ): Promise<void>;

  /** Auditoría del Admin — sin restricción de ownership sobre el chat
   * (gateada por rol desde el controller), pero igual corre con el
   * contexto de sesión del admin que pregunta. */
  abstract listarMensajesAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<MensajeChat[]>;
}
