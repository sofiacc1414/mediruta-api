import { IntencionChatbot } from './intencion-chatbot';

export const MENSAJE_NO_ENTENDIDO =
  'No estoy seguro de haber entendido tu pregunta. ¿Podés reformularla?';

export const MENSAJE_SOPORTE_HUMANO =
  'Parece que no estoy logrando ayudarte con esto. Escribinos directo a ' +
  'soporte@mediruta.com y te responde una persona del equipo.';

/** Contenido fijo de las preguntas frecuentes operativas de la app —
 * construido a partir de cómo funciona MediRuta realmente, no datos
 * externos que cambien. */
export const RESPUESTAS_ESTATICAS: Partial<Record<IntencionChatbot, string>> = {
  registro_cuenta:
    'Para registrarte, tocá "Crear cuenta" en la pantalla de inicio y elegí tu rol: ' +
    'Paciente o Domiciliario. Como Paciente necesitás tu cédula (frente y reverso) y tu ' +
    'dirección. Como Domiciliario necesitás además tus documentos de vehículo. Tu cuenta ' +
    'queda activa apenas te registrás — no hace falta un paso de verificación aparte.',
  cambio_contrasena:
    'Si olvidaste tu contraseña, tocá "¿Olvidaste tu contraseña?" en la pantalla de inicio de ' +
    'sesión e ingresá tu correo — te llega un código para crear una nueva. Si ya iniciaste ' +
    'sesión y solo querés cambiarla, lo hacés desde tu perfil.',
  baja_cuenta:
    'Para desactivar tu cuenta, andá a tu Perfil y tocá "Desactivar cuenta". Si cambiás de ' +
    'opinión, podés reactivarla cuando quieras: intentá iniciar sesión de nuevo con tu correo ' +
    'y contraseña de siempre, y la app te va a ofrecer reactivarla ahí mismo.',
  cobros_tarifas:
    'El precio de tu pedido se arma con dos partes: el copago que elegiste en tu perfil (un ' +
    'valor fijo que vos mismo declarás — ojo, NO es la cuota moderadora real de tu EPS, es un ' +
    'catálogo propio de MediRuta) + el costo del domicilio (una tarifa base más un valor por ' +
    'cada kilómetro entre la farmacia y tu dirección de entrega). Lo ves completo ANTES de ' +
    'confirmar el pedido, y no cambia después — no depende de cuánto tarde el domiciliario, ' +
    'solo de la distancia real entre las dos direcciones. Si querés el valor de la cuota ' +
    'moderadora real de tu EPS, preguntame por "copago" aparte.',
  cancelacion_costo:
    'Podés cancelar tu pedido en cualquier momento antes de que te lo entreguen, sin ningún ' +
    'costo — hoy no hay cargo por cancelar ni restricción según en qué etapa esté.',
  pedir_medicamentos:
    'Desde "Nueva solicitud" elegís la dirección de la farmacia y de entrega, subís la foto ' +
    'o PDF de tu fórmula médica (el sistema intenta leerla automáticamente y precargar los ' +
    'medicamentos — siempre podés corregir lo que falte), y confirmás el pedido. Un ' +
    'domiciliario lo acepta y te lo trae.',
  chat_domiciliario:
    'El chat con tu domiciliario se habilita apenas alguien acepta tu pedido, y queda ' +
    'disponible mientras el pedido está en curso. Es solo para coordinar esa entrega puntual ' +
    '(ej. indicaciones de dónde recibir) — no es un canal de soporte de la plataforma.',
  reclamo_farmacia:
    'El domiciliario reclama tus medicamentos en la farmacia mostrando tu cédula (frente y ' +
    'reverso) y, si tu fórmula la trae, la foto de la receta — eso lo ve directamente en la ' +
    'app, estando físicamente en la farmacia. Vos no tenés que hacer nada en ese momento.',
  novedad_pedido:
    'Si hay un problema con el pedido (dirección difícil de encontrar, el paciente no ' +
    'contesta, la farmacia está cerrada, etc.), usá "Reportar novedad" desde el detalle del ' +
    'pedido — tanto Paciente como Domiciliario pueden hacerlo. Queda registrada y un ' +
    'administrador la revisa; no hace falta cancelar el pedido para reportarla.',
  codigo_entrega:
    'Si el código de entrega que te dio el paciente no coincide, primero confirmá que lo ' +
    'estés escribiendo tal cual (no distingue mayúsculas/minúsculas). Si igual no funciona o ' +
    'el paciente dice que nunca le llegó, usá la opción "El código no se generó" en el pedido ' +
    '— un administrador lo regenera o se lo reenvía por correo.',
  pos_no_pos:
    'Si tu medicamento es No POS (no está en el plan de beneficios básico), tu médico debe ' +
    'tramitarlo ante la Junta Médica de tu EPS o por MIPRES (Mi Prescripción) — es un trámite ' +
    'que hace la IPS/EPS, no algo que se gestione desde MediRuta. Una vez aprobado, tu fórmula ' +
    'queda igual de válida para pedir el domicilio acá.',
};
