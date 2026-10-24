export type AvisoPush = {
  tokens: string[];
  titulo: string;
  mensaje: string;
  /** Mismos valores que `TipoNotificacion` — viaja en el payload para que
   * el cliente pueda resolver a qué pantalla navegar al tocar el push,
   * igual que ya hace con las notificaciones internas (ver
   * `destinoNotificacion` del lado Flutter). */
  tipo: string;
  referenciaTipo: string;
  referenciaId: string | null;
};

/** Envío push. Si no hay credenciales o tokens, no hace nada y no falla
 * la operación de negocio que lo disparó. */
export abstract class PushNotificacionPort {
  abstract enviar(aviso: AvisoPush): Promise<void>;
}
