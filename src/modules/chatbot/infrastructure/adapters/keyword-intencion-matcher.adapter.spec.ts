import {
  IntencionChatbot,
  UMBRAL_CONFIANZA_MINIMO,
} from '../../domain/intencion-chatbot';
import { KeywordIntencionMatcherAdapter } from './keyword-intencion-matcher.adapter';

// Set de frases variadas por intención — no son las 200 frases del CA2
// (requeriría un dataset etiquetado que no existe todavía), pero cubre
// paráfrasis reales por intención para validar que el clasificador
// generaliza más allá de las frases disparadoras exactas.
const CASOS: { mensaje: string; esperado: IntencionChatbot }[] = [
  { mensaje: '¿Cómo me registro en la app?', esperado: 'registro_cuenta' },
  { mensaje: 'quiero crear una cuenta nueva', esperado: 'registro_cuenta' },
  { mensaje: 'como hago para ser domiciliario', esperado: 'registro_cuenta' },
  {
    mensaje: 'Necesito verificar mi cuenta, ¿cómo lo hago?',
    esperado: 'registro_cuenta',
  },
  { mensaje: 'soy nuevo aca, como empiezo', esperado: 'registro_cuenta' },

  {
    mensaje: 'Olvidé mi contraseña, ¿qué hago?',
    esperado: 'cambio_contrasena',
  },
  { mensaje: 'como recupero mi contraseña', esperado: 'cambio_contrasena' },
  { mensaje: 'no recuerdo mi clave', esperado: 'cambio_contrasena' },

  { mensaje: '¿Cómo me doy de baja?', esperado: 'baja_cuenta' },
  { mensaje: 'quiero eliminar mi cuenta', esperado: 'baja_cuenta' },
  { mensaje: 'como reactivo mi cuenta desactivada', esperado: 'baja_cuenta' },

  { mensaje: '¿Cuánto cuesta el domicilio?', esperado: 'cobros_tarifas' },
  {
    mensaje: '¿Cómo se calcula el precio del pedido?',
    esperado: 'cobros_tarifas',
  },
  { mensaje: 'por que me cobran esto', esperado: 'cobros_tarifas' },
  {
    mensaje: '¿cobran tarifa de servicio como en otras apps?',
    esperado: 'cobros_tarifas',
  },

  { mensaje: '¿Cancelar tiene algún costo?', esperado: 'cancelacion_costo' },
  {
    mensaje: 'hay multa por cancelar mi pedido',
    esperado: 'cancelacion_costo',
  },

  { mensaje: '¿Cómo pido mis medicamentos?', esperado: 'pedir_medicamentos' },
  // Casos reales reportados: fallaban antes de agregar la capa de
  // raíces (ninguna frase armada a mano los cubría).
  {
    mensaje: '¿Cómo es el proceso para pedir medicamentos?',
    esperado: 'pedir_medicamentos',
  },
  {
    mensaje: 'necesito saber cómo pedir medicamentos en la app',
    esperado: 'pedir_medicamentos',
  },
  { mensaje: 'como hago un pedido nuevo', esperado: 'pedir_medicamentos' },
  { mensaje: '¿cómo género un pedido?', esperado: 'pedir_medicamentos' },
  { mensaje: 'como genero un pedido', esperado: 'pedir_medicamentos' },
  {
    mensaje: 'quiero subir la foto de mi formula',
    esperado: 'pedir_medicamentos',
  },
  { mensaje: 'como envio la receta medica', esperado: 'pedir_medicamentos' },

  {
    mensaje: '¿Cómo hablo con el domiciliario?',
    esperado: 'chat_domiciliario',
  },
  {
    mensaje: 'quiero contactar al domiciliario',
    esperado: 'chat_domiciliario',
  },
  {
    mensaje: 'necesito escribirle al domiciliario de mi pedido',
    esperado: 'chat_domiciliario',
  },

  {
    mensaje: '¿Qué necesito para reclamar en la farmacia?',
    esperado: 'reclamo_farmacia',
  },
  {
    mensaje: 'que documentos para reclamar mis medicamentos',
    esperado: 'reclamo_farmacia',
  },
  { mensaje: 'cual es el proceso para reclamar', esperado: 'reclamo_farmacia' },

  { mensaje: '¿Cuánto es el copago?', esperado: 'copago_eps' },
  { mensaje: 'cuanto pago de cuota moderadora', esperado: 'copago_eps' },
  {
    mensaje: 'cual es el valor del copago segun mis ingresos',
    esperado: 'copago_eps',
  },

  {
    mensaje: '¿Cuáles son las farmacias de mi EPS?',
    esperado: 'farmacias_eps',
  },
  { mensaje: 'que farmacias aliadas tengo', esperado: 'farmacias_eps' },
  {
    mensaje: 'en que droguerias puedo reclamar con mi eps',
    esperado: 'farmacias_eps',
  },
  // Caso real reportado: esta paráfrasis fallaba (daba "desconocido")
  // antes de ampliar los disparadores.
  { mensaje: '¿Ok y cómo sé cuál es mi farmacia?', esperado: 'farmacias_eps' },
  {
    mensaje: 'no se la direccion de la farmacia de mi eps',
    esperado: 'farmacias_eps',
  },

  { mensaje: '¿Qué es un medicamento No POS?', esperado: 'pos_no_pos' },
  { mensaje: 'como tramito un mipres', esperado: 'pos_no_pos' },
  { mensaje: 'necesito pasar por junta medica', esperado: 'pos_no_pos' },

  {
    mensaje: '¿Cómo reporto una novedad del pedido?',
    esperado: 'novedad_pedido',
  },
  {
    mensaje: 'no encuentro la direccion del paciente',
    esperado: 'novedad_pedido',
  },
  {
    mensaje: 'el paciente no contesta el telefono',
    esperado: 'novedad_pedido',
  },
  { mensaje: 'la farmacia esta cerrada que hago', esperado: 'novedad_pedido' },

  {
    mensaje: '¿Qué hago si el código de entrega no funciona?',
    esperado: 'codigo_entrega',
  },
  {
    mensaje: 'el codigo no coincide con el del paciente',
    esperado: 'codigo_entrega',
  },
  {
    mensaje: 'al paciente no le llego el codigo de entrega',
    esperado: 'codigo_entrega',
  },
];

// Frases reales, tal cual las escribió el usuario probando la app —
// las 3 fallaban ("desconocido") antes de este fix.
const CASOS_REALES_REPORTADOS: {
  mensaje: string;
  esperado: IntencionChatbot;
}[] = [
  {
    mensaje: 'hola como se que farmacias tiene mi eps?',
    esperado: 'farmacias_eps',
  },
  {
    mensaje: 'como es el proceso para pedir medicamentos?',
    esperado: 'pedir_medicamentos',
  },
  { mensaje: 'como me doy de baja?', esperado: 'baja_cuenta' },
  {
    mensaje: 'se activa mi cuenta automaticamente?',
    esperado: 'registro_cuenta',
  },
  { mensaje: 'cual es el precio del servicio?', esperado: 'cobros_tarifas' },
];

describe('KeywordIntencionMatcherAdapter', () => {
  const adapter = new KeywordIntencionMatcherAdapter();

  it.each(CASOS_REALES_REPORTADOS)(
    'caso real reportado: "$mensaje" -> $esperado',
    ({ mensaje, esperado }) => {
      const resultado = adapter.clasificar(mensaje);
      expect(resultado.intencion).toBe(esperado);
      expect(resultado.score).toBeGreaterThanOrEqual(UMBRAL_CONFIANZA_MINIMO);
    },
  );

  it.each(CASOS)(
    'clasifica "$mensaje" como $esperado',
    ({ mensaje, esperado }) => {
      const resultado = adapter.clasificar(mensaje);
      expect(resultado.intencion).toBe(esperado);
      expect(resultado.score).toBeGreaterThanOrEqual(UMBRAL_CONFIANZA_MINIMO);
    },
  );

  it('precisión sobre el set de casos variados es >= 90%', () => {
    const aciertos = CASOS.filter(
      ({ mensaje, esperado }) =>
        adapter.clasificar(mensaje).intencion === esperado,
    ).length;
    expect(aciertos / CASOS.length).toBeGreaterThanOrEqual(0.9);
  });

  it('un mensaje sin relación con ningún FAQ da score 0 / desconocido', () => {
    const resultado = adapter.clasificar('qué clima hace hoy en Medellín');
    expect(resultado.intencion).toBe('desconocido');
    expect(resultado.score).toBe(0);
  });

  it('es insensible a mayúsculas y tildes', () => {
    const resultado = adapter.clasificar('CÓMO ME REGÍSTRO EN LA APP');
    expect(resultado.intencion).toBe('registro_cuenta');
  });
});
