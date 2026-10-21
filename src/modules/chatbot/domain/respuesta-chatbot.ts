import { IntencionChatbot } from './intencion-chatbot';

/** `requiereDatos` le dice a la app qué le falta pedir al usuario
 * antes de poder responder de verdad (CA1: "debe solicitar
 * explícitamente" la EPS/el rango de ingresos) — la app muestra
 * botones de selección rápida y reenvía el mismo mensaje original
 * junto con esos datos. */
export type RespuestaChatbot = {
  intencion: IntencionChatbot;
  score: number;
  respuesta: string;
  requiereDatos: 'eps' | 'datos_copago' | null;
};
