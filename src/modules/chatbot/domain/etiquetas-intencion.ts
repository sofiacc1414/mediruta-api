import { IntencionChatbot } from './intencion-chatbot';

/** Texto corto para el botón de sugerencia que ve el paciente cuando
 * el score no cruza `UMBRAL_CONFIANZA_MINIMO` pero sí
 * `UMBRAL_SUGERENCIA` — al tocarlo, la app reenvía el mensaje original
 * con `intencionForzada` en ese valor. */
export const ETIQUETAS_INTENCION: Partial<Record<IntencionChatbot, string>> = {
  registro_cuenta: 'Cómo crear o activar mi cuenta',
  cambio_contrasena: 'Cambiar o recuperar mi contraseña',
  baja_cuenta: 'Dar de baja o reactivar mi cuenta',
  cobros_tarifas: 'Cuánto cuesta el domicilio',
  cancelacion_costo: 'Costo de cancelar un pedido',
  pedir_medicamentos: 'Cómo pedir mis medicamentos',
  chat_domiciliario: 'Hablar con mi domiciliario',
  reclamo_farmacia: 'Qué necesito para reclamar en la farmacia',
  copago_eps: 'Cuánto es mi copago',
  farmacias_eps: 'Farmacias de mi EPS',
  novedad_pedido: 'Reportar un problema con mi pedido',
  codigo_entrega: 'Problemas con el código de entrega',
  pos_no_pos: 'Medicamentos No POS / MIPRES',
};
