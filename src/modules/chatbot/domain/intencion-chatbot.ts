export const INTENCIONES_CHATBOT = [
  'registro_cuenta',
  'cambio_contrasena',
  'pedir_medicamentos',
  'chat_domiciliario',
  'reclamo_farmacia',
  'copago_eps',
  'farmacias_eps',
  'pos_no_pos',
  'novedad_pedido',
  'codigo_entrega',
  'desconocido',
] as const;

export type IntencionChatbot = (typeof INTENCIONES_CHATBOT)[number];

export type ResultadoClasificacion = {
  intencion: IntencionChatbot;
  score: number;
};

/** CA3: por debajo de esto, la intención detectada no es confiable —
 * se trata como "desconocido" aunque el matcher haya encontrado algo. */
export const UMBRAL_CONFIANZA_MINIMO = 0.7;

export type RangoIngresos = 'menos_2_smlv' | 'entre_2_y_5_smlv' | 'mas_5_smlv';
