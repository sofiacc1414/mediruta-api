export type AvisoPush = {
  tokens: string[];
  titulo: string;
  mensaje: string;
  referenciaTipo: string;
  referenciaId: string | null;
};

/** Envío push. Si no hay credenciales o tokens, no hace nada y no falla
 * la operación de negocio que lo disparó. */
export abstract class PushNotificacionPort {
  abstract enviar(aviso: AvisoPush): Promise<void>;
}
