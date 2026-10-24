import { Injectable } from '@nestjs/common';
import {
  IntencionChatbot,
  ResultadoClasificacion,
} from '../../domain/intencion-chatbot';
import { IntencionMatcherPort } from '../../domain/ports/intencion-matcher.port';

type Disparador = { frase: string; peso: number };
type Raiz = { raiz: string; peso: number };

/** Dos capas de señal por intención:
 *
 * - `DISPARADORES` — frases de 2-5 palabras, exactas (substring) sobre
 *   el mensaje normalizado. Alta precisión: cuando matchean, son
 *   prácticamente inequívocas. Pero frágiles ante paráfrasis reales
 *   ("cómo es el proceso para pedir medicamentos" no contiene ninguna
 *   de las frases armadas a mano) — bug real reportado varias veces.
 * - `RAICES` — una palabra significativa por prefijo (tolera plurales
 *   y conjugaciones: "farmaci" matchea "farmacia"/"farmacias",
 *   "registr" matchea "registro"/"registrarme"/"registrando"), peso
 *   más bajo porque una sola palabra aislada es más ambigua. Dan
 *   cobertura amplia donde las frases fallan, sin tener que adivinar
 *   cada paráfrasis posible a mano.
 *
 * El score final de una intención es la suma de ambas capas, tope 1.0.
 * Esto sigue siendo "sin microservicio nuevo" (pedido explícito) —
 * solo mejor que coincidencia de substring puro. */
const DISPARADORES: Record<
  Exclude<IntencionChatbot, 'desconocido'>,
  Disparador[]
> = {
  registro_cuenta: [
    { frase: 'como me registro', peso: 1 },
    { frase: 'como registrarme', peso: 1 },
    { frase: 'como creo una cuenta', peso: 1 },
    { frase: 'como crear una cuenta', peso: 1 },
    { frase: 'como me inscribo', peso: 1 },
    { frase: 'crear cuenta', peso: 0.7 },
    { frase: 'crear una cuenta', peso: 0.8 },
    { frase: 'necesito una cuenta', peso: 0.8 },
    { frase: 'soy nuevo', peso: 0.6 },
    { frase: 'soy nueva', peso: 0.6 },
    { frase: 'como empiezo', peso: 0.6 },
    { frase: 'requisitos para registrarme', peso: 1 },
    { frase: 'que documentos necesito para registrarme', peso: 1 },
    { frase: 'como verifico mi cuenta', peso: 1 },
    { frase: 'verificar mi cuenta', peso: 0.8 },
    { frase: 'activar mi cuenta', peso: 0.8 },
    { frase: 'quiero ser domiciliario', peso: 1 },
    { frase: 'como me vuelvo domiciliario', peso: 1 },
    { frase: 'como me hago domiciliario', peso: 1 },
    { frase: 'ser repartidor', peso: 0.7 },
    { frase: 'ser domiciliario', peso: 0.8 },
    // Vocabulario colombiano: "mensajero" es sinónimo coloquial de
    // domiciliario/repartidor en varias regiones.
    { frase: 'quiero ser mensajero', peso: 1 },
    { frase: 'trabajar como domiciliario', peso: 1 },
    { frase: 'como trabajo con ustedes', peso: 0.9 },
    { frase: 'quiero trabajar con mediruta', peso: 0.9 },
    { frase: 'como me uno a mediruta', peso: 0.9 },
    { frase: 'requisitos para ser domiciliario', peso: 1 },
    { frase: 'que necesito para ser domiciliario', peso: 1 },
    { frase: 'como creo mi usuario', peso: 0.9 },
    { frase: 'como ingreso por primera vez', peso: 0.7 },
    { frase: 'no tengo cuenta todavia', peso: 0.7 },
  ],
  cambio_contrasena: [
    { frase: 'olvide mi contraseña', peso: 1 },
    { frase: 'olvide mi clave', peso: 1 },
    { frase: 'como cambio mi contraseña', peso: 1 },
    { frase: 'como cambio la contraseña', peso: 1 },
    { frase: 'recuperar mi contraseña', peso: 1 },
    { frase: 'recupero mi contraseña', peso: 1 },
    { frase: 'recuperar contraseña', peso: 0.9 },
    { frase: 'restablecer contraseña', peso: 1 },
    { frase: 'no me acuerdo la contraseña', peso: 1 },
    { frase: 'no recuerdo mi contraseña', peso: 1 },
    { frase: 'no recuerdo mi clave', peso: 1 },
    { frase: 'como entro si olvide la clave', peso: 1 },
    { frase: 'se me olvido la clave', peso: 1 },
    { frase: 'se me olvido la contraseña', peso: 1 },
    { frase: 'perdi mi contraseña', peso: 1 },
    { frase: 'perdi mi clave', peso: 1 },
    { frase: 'clave incorrecta', peso: 0.8 },
    { frase: 'contraseña incorrecta', peso: 0.8 },
    { frase: 'cambiar mi clave', peso: 0.9 },
    { frase: 'actualizar mi contraseña', peso: 0.9 },
    { frase: 'no me deja entrar', peso: 0.6 },
    { frase: 'no puedo iniciar sesion', peso: 0.7 },
  ],
  baja_cuenta: [
    { frase: 'como me doy de baja', peso: 1 },
    { frase: 'darme de baja', peso: 1 },
    { frase: 'eliminar mi cuenta', peso: 1 },
    { frase: 'borrar mi cuenta', peso: 1 },
    { frase: 'cerrar mi cuenta', peso: 0.9 },
    { frase: 'ya no quiero usar la app', peso: 0.8 },
    { frase: 'como reactivo mi cuenta', peso: 1 },
    { frase: 'reactivar mi cuenta', peso: 0.9 },
    { frase: 'quiero desactivar mi cuenta', peso: 1 },
    { frase: 'borrar mi perfil', peso: 0.9 },
    { frase: 'eliminar mi perfil', peso: 0.9 },
    { frase: 'no quiero usar mas la app', peso: 0.8 },
    { frase: 'cancelar mi cuenta', peso: 0.7 },
  ],
  cobros_tarifas: [
    { frase: 'cuanto cuesta el domicilio', peso: 1 },
    { frase: 'cuanto vale el domicilio', peso: 1 },
    { frase: 'cuanto cuesta el pedido', peso: 1 },
    { frase: 'como se calcula el precio', peso: 1 },
    { frase: 'como calculan el precio', peso: 1 },
    { frase: 'por que me cobran', peso: 0.9 },
    { frase: 'cuanto me van a cobrar', peso: 1 },
    { frase: 'tarifa del domicilio', peso: 0.9 },
    { frase: 'costo del domicilio', peso: 0.9 },
    { frase: 'precio del domicilio', peso: 0.9 },
    { frase: 'de que se compone el precio', peso: 1 },
    { frase: 'hay cargo adicional', peso: 0.8 },
    { frase: 'cobran propina', peso: 0.8 },
    { frase: 'tarifa de servicio', peso: 0.8 },
    // Vocabulario colombiano: "domi" como apócope de "domicilio" (no
    // de "domiciliario" — ojo, por eso va como frase exacta y no como
    // raíz, "domi" también es el inicio de "domiciliario").
    { frase: 'cuanto cuesta el domi', peso: 1 },
    { frase: 'cuanto vale el domi', peso: 1 },
    { frase: 'cuanto es el domi', peso: 0.9 },
    { frase: 'cuanta plata cuesta el domicilio', peso: 1 },
    { frase: 'cuanta plata es el envio', peso: 1 },
    { frase: 'cuanto cuesta el envio', peso: 1 },
    { frase: 'cuanto vale el envio', peso: 1 },
    { frase: 'cuanto es el flete', peso: 0.9 },
    { frase: 'cuanto me cobran por traer el pedido', peso: 1 },
    { frase: 'tiene costo adicional', peso: 0.8 },
  ],
  cancelacion_costo: [
    { frase: 'puedo cancelar sin costo', peso: 1 },
    { frase: 'cancelar tiene costo', peso: 1 },
    { frase: 'cuanto cuesta cancelar', peso: 1 },
    { frase: 'cobran algo por cancelar', peso: 1 },
    { frase: 'hay multa por cancelar', peso: 1 },
    { frase: 'puedo cancelar mi pedido', peso: 0.8 },
    { frase: 'como cancelo mi pedido', peso: 0.8 },
    { frase: 'si cancelo me cobran', peso: 1 },
    { frase: 'tiene penalidad cancelar', peso: 1 },
    { frase: 'puedo cancelar gratis', peso: 0.9 },
    { frase: 'cancelar sale caro', peso: 0.9 },
  ],
  pedir_medicamentos: [
    { frase: 'como pido medicamentos', peso: 1 },
    { frase: 'como pido mis medicamentos', peso: 1 },
    { frase: 'como hago un pedido', peso: 1 },
    { frase: 'como solicito mis medicamentos', peso: 1 },
    { frase: 'como monto un pedido', peso: 1 },
    { frase: 'nueva solicitud', peso: 0.7 },
    { frase: 'como envio la receta', peso: 1 },
    { frase: 'como subo la formula', peso: 1 },
    { frase: 'subir la formula', peso: 0.9 },
    { frase: 'subir la receta', peso: 0.9 },
    { frase: 'subir mi formula', peso: 0.9 },
    { frase: 'foto de mi formula', peso: 0.9 },
    { frase: 'foto de la formula', peso: 0.9 },
    { frase: 'foto de la receta', peso: 0.9 },
    { frase: 'como adjunto la receta', peso: 1 },
    { frase: 'como creo una solicitud', peso: 1 },
    { frase: 'quiero pedir mis medicinas', peso: 1 },
    { frase: 'pedir mis medicinas', peso: 0.8 },
    { frase: 'traer mis medicamentos', peso: 0.8 },
    { frase: 'como funciona un pedido', peso: 0.9 },
    { frase: 'proceso para pedir medicamentos', peso: 1 },
    { frase: 'proceso para pedir mis medicamentos', peso: 1 },
    { frase: 'quiero pedir mis pastillas', peso: 0.9 },
    { frase: 'necesito mis medicinas', peso: 0.7 },
    { frase: 'como ordeno mis medicamentos', peso: 1 },
    { frase: 'quiero hacer un pedido', peso: 0.9 },
    { frase: 'quiero hacer una orden', peso: 0.7 },
    { frase: 'subir foto de la orden medica', peso: 1 },
    { frase: 'como adjunto la orden', peso: 0.9 },
    { frase: 'necesito subir mi orden', peso: 0.9 },
    { frase: 'como creo un pedido', peso: 1 },
    { frase: 'como monto una solicitud', peso: 1 },
  ],
  chat_domiciliario: [
    { frase: 'chatear con el domiciliario', peso: 1 },
    { frase: 'como hablo con el domiciliario', peso: 1 },
    { frase: 'chat con el domiciliario', peso: 1 },
    { frase: 'hablar con mi domiciliario', peso: 1 },
    { frase: 'contactar al domiciliario', peso: 1 },
    { frase: 'mensaje al domiciliario', peso: 0.9 },
    { frase: 'donde esta el domiciliario', peso: 0.8 },
    { frase: 'comunicarme con el repartidor', peso: 1 },
    { frase: 'escribirle al domiciliario', peso: 0.9 },
    { frase: 'quiero escribirle al repartidor', peso: 1 },
    { frase: 'como me comunico con el domiciliario', peso: 1 },
    { frase: 'puedo llamar al domiciliario', peso: 0.9 },
    { frase: 'como le aviso al domiciliario', peso: 0.9 },
    { frase: 'hablar con el domi', peso: 0.9 },
  ],
  reclamo_farmacia: [
    { frase: 'como reclamo en la farmacia', peso: 1 },
    { frase: 'proceso para reclamar', peso: 0.9 },
    { frase: 'que necesito para reclamar', peso: 1 },
    { frase: 'que debo llevar a la farmacia', peso: 1 },
    { frase: 'documentos para reclamar', peso: 1 },
    { frase: 'como retira el domiciliario', peso: 0.9 },
    { frase: 'cedula para reclamar', peso: 0.9 },
    { frase: 'recogida en la farmacia', peso: 0.8 },
    { frase: 'reclamar mis medicamentos', peso: 0.8 },
    { frase: 'reclamar en la droguería', peso: 0.9 },
    { frase: 'que debo mostrar en la farmacia', peso: 0.9 },
    { frase: 'debo llevar la cedula a la farmacia', peso: 1 },
    { frase: 'necesitan mi cedula en la farmacia', peso: 1 },
  ],
  copago_eps: [
    { frase: 'cuanto es el copago', peso: 1 },
    { frase: 'cuanto pago de copago', peso: 1 },
    { frase: 'cuota moderadora', peso: 0.9 },
    { frase: 'cuanto me cuesta la consulta', peso: 0.9 },
    { frase: 'cuanto debo pagar', peso: 0.7 },
    { frase: 'valor del copago', peso: 1 },
    { frase: 'copago segun mis ingresos', peso: 1 },
    { frase: 'cuanto es la cuota moderadora', peso: 1 },
    { frase: 'cuanto cuesta el copago', peso: 1 },
    { frase: 'cuanto tengo que pagar en la farmacia', peso: 0.9 },
    { frase: 'tengo que pagar algo en la droguería', peso: 0.9 },
    { frase: 'cuanto pago segun mi eps', peso: 1 },
    { frase: 'me toca pagar algo', peso: 0.6 },
    { frase: 'cuanta plata es el copago', peso: 1 },
  ],
  farmacias_eps: [
    { frase: 'farmacias de mi eps', peso: 1 },
    { frase: 'que farmacias trabajan con mi eps', peso: 1 },
    { frase: 'donde reclamo segun mi eps', peso: 1 },
    { frase: 'farmacias aliadas', peso: 0.9 },
    { frase: 'en que droguerias puedo reclamar', peso: 1 },
    { frase: 'farmacias afiliadas a mi eps', peso: 1 },
    { frase: 'cual es la farmacia de mi eps', peso: 1 },
    { frase: 'cual es mi farmacia', peso: 1 },
    { frase: 'cual es mi droguería', peso: 1 },
    { frase: 'como se cual es mi farmacia', peso: 1 },
    { frase: 'donde queda mi farmacia', peso: 1 },
    { frase: 'mi farmacia de la eps', peso: 1 },
    { frase: 'la farmacia de mi eps', peso: 1 },
    { frase: 'direccion de la farmacia de mi eps', peso: 1 },
    { frase: 'direccion de mi farmacia', peso: 0.9 },
    { frase: 'no se cual es mi farmacia', peso: 1 },
    { frase: 'no se la direccion de la farmacia', peso: 1 },
    { frase: 'en que droguería reclamo', peso: 1 },
    { frase: 'cual droguería me corresponde', peso: 1 },
    { frase: 'farmacia asignada', peso: 0.8 },
    { frase: 'a que farmacia debo ir', peso: 1 },
    { frase: 'a que droguería debo ir', peso: 1 },
  ],
  novedad_pedido: [
    { frase: 'reportar novedad', peso: 1 },
    { frase: 'reporto una novedad', peso: 1 },
    { frase: 'novedad del pedido', peso: 0.9 },
    { frase: 'novedad de mi pedido', peso: 0.9 },
    { frase: 'hay un problema con el pedido', peso: 1 },
    { frase: 'error con el pedido', peso: 0.9 },
    { frase: 'el paciente no contesta', peso: 1 },
    { frase: 'no encuentro la direccion', peso: 1 },
    { frase: 'la direccion esta mal', peso: 1 },
    { frase: 'direccion equivocada', peso: 0.9 },
    { frase: 'la farmacia esta cerrada', peso: 1 },
    { frase: 'que hago si hay un error', peso: 0.9 },
    { frase: 'que hago si la direccion', peso: 0.9 },
    { frase: 'problema con la direccion', peso: 1 },
    { frase: 'no puedo llegar a la direccion', peso: 1 },
    { frase: 'el pedido esta demorado', peso: 1 },
    { frase: 'pedido atrasado', peso: 0.9 },
    { frase: 'demora en la entrega', peso: 1 },
    { frase: 'mi pedido no avanza', peso: 0.9 },
    { frase: 'el domi no llega', peso: 0.9 },
  ],
  codigo_entrega: [
    { frase: 'codigo de entrega', peso: 0.9 },
    { frase: 'el codigo no funciona', peso: 1 },
    { frase: 'el codigo no coincide', peso: 1 },
    { frase: 'codigo no sirve', peso: 1 },
    { frase: 'el codigo no se genero', peso: 1 },
    { frase: 'no me llego el codigo', peso: 1 },
    { frase: 'que hago si el codigo', peso: 0.9 },
    { frase: 'no tengo el codigo', peso: 0.9 },
    { frase: 'perdi el codigo de entrega', peso: 1 },
    { frase: 'me pueden reenviar el codigo', peso: 1 },
    { frase: 'el codigo esta vencido', peso: 1 },
  ],
  pos_no_pos: [
    { frase: 'no pos', peso: 0.9 },
    { frase: 'mipres', peso: 1 },
    { frase: 'medicamento no pos', peso: 1 },
    { frase: 'no esta cubierto', peso: 0.7 },
    { frase: 'junta medica', peso: 0.8 },
    { frase: 'como tramito un no pos', peso: 1 },
    { frase: 'que es mipres', peso: 1 },
    { frase: 'plan de beneficios', peso: 0.7 },
    { frase: 'medicamento no incluido', peso: 0.9 },
    { frase: 'no me lo cubre la eps', peso: 0.9 },
    { frase: 'formato mipres', peso: 1 },
    { frase: 'tengo que tramitar algo especial', peso: 0.7 },
  ],
};

/** Una palabra por raíz (prefijo) — `token.startsWith(raiz)` sobre el
 * mensaje tokenizado. Dos niveles de peso, no uno: una palabra
 * genuinamente inequívoca en este dominio ("precio", "copago",
 * "mipres") pesa >= 0.7 y alcanza sola — bug real repetido varias
 * veces: pesos moderados obligaban a que aparecieran dos raíces
 * juntas, pero una pregunta corta real trae una sola palabra clara.
 * Las raíces genuinamente ambiguas (comparten palabra con otra
 * intención, ej. "farmacia") se quedan en peso moderado a propósito,
 * necesitan otra señal para confirmar. */
const RAICES: Record<Exclude<IntencionChatbot, 'desconocido'>, Raiz[]> = {
  registro_cuenta: [
    { raiz: 'registr', peso: 0.75 },
    { raiz: 'inscrib', peso: 0.75 },
    { raiz: 'repartidor', peso: 0.6 },
    // Vocabulario colombiano: "mensajero" como sinónimo de domiciliario.
    { raiz: 'mensajer', peso: 0.6 },
    // Pregunta de seguimiento real reportada ("¿se activa mi cuenta
    // automáticamente?") sobre lo que el bot ya había contestado —
    // "activ" + "cuenta" juntos alcanzan el umbral solos.
    { raiz: 'activ', peso: 0.5 },
    { raiz: 'cuenta', peso: 0.3 },
  ],
  cambio_contrasena: [
    { raiz: 'contrasen', peso: 0.75 },
    // "clave" sola queda moderada: también se usa genéricamente
    // ("es clave que...", nada que ver con contraseñas).
    { raiz: 'clave', peso: 0.4 },
  ],
  baja_cuenta: [
    { raiz: 'desactiv', peso: 0.75 },
    { raiz: 'reactiv', peso: 0.75 },
    // "eliminar" sola es genérica (eliminar un medicamento de la
    // lista, etc.) — moderada, necesita otra señal para confirmar.
    { raiz: 'elimin', peso: 0.5 },
  ],
  cobros_tarifas: [
    // "precio"/"tarifa" son inequívocas en este dominio — no hace
    // falta que aparezcan combinadas con otra palabra para confirmar
    // la intención (bug real: pesos bajos exigían 2 señales juntas,
    // pero una pregunta corta real suele traer solo una).
    { raiz: 'tarifa', peso: 0.75 },
    { raiz: 'precio', peso: 0.75 },
    { raiz: 'cobr', peso: 0.6 },
    { raiz: 'propina', peso: 0.75 },
    { raiz: 'servicio', peso: 0.3 },
    // Vocabulario colombiano: "flete"/"recargo" para el costo del
    // domicilio, "plata" para dinero en general (moderada: "plata" se
    // usa para cualquier cosa, no solo el precio del domicilio).
    { raiz: 'flete', peso: 0.75 },
    { raiz: 'recargo', peso: 0.7 },
    { raiz: 'plata', peso: 0.4 },
    { raiz: 'envio', peso: 0.5 },
  ],
  cancelacion_costo: [
    { raiz: 'cancel', peso: 0.75 },
    { raiz: 'multa', peso: 0.7 },
    { raiz: 'costo', peso: 0.3 },
  ],
  pedir_medicamentos: [
    { raiz: 'formula', peso: 0.75 },
    { raiz: 'receta', peso: 0.7 },
    { raiz: 'solicitud', peso: 0.5 },
    // "pedir"+"medicamentos" (o "pedido") juntos son, en la práctica,
    // tan inequívocos como una frase armada a mano — se suben los
    // pesos para que esa combinación sola ya cruce el umbral sin
    // depender de que el mensaje calce con una frase exacta.
    { raiz: 'pedi', peso: 0.4 },
    { raiz: 'medicament', peso: 0.4 },
    // Bug real reportado: "¿cómo género un pedido?" (con tilde, typo
    // frecuente de "genero") no matcheaba ninguna frase armada a mano
    // ("como monto/hago un pedido" exigen esa palabra exacta) y la
    // única raíz que prendía era "pedi" (0.4), por debajo del umbral.
    // "gener" + "pedi"/"medicament" juntos ya son inequívocos acá
    // (generar/genero/género/generación un pedido/solicitud).
    { raiz: 'gener', peso: 0.3 },
    // "orden" (sinónimo colombiano de fórmula/receta médica) y
    // "pastilla"/"medicina" son comunes pero algo genéricas solas —
    // moderadas, igual que "solicitud".
    { raiz: 'orden', peso: 0.3 },
    { raiz: 'pastilla', peso: 0.6 },
    { raiz: 'medicin', peso: 0.5 },
  ],
  chat_domiciliario: [
    { raiz: 'domiciliari', peso: 0.2 },
    // "domi" (apócope colombiano) es ambiguo a propósito: también es
    // el inicio de "domiciliario" y de "domicilio" (costo) — queda
    // bajo, necesita otra señal (ver también cobros_tarifas).
    { raiz: 'domi', peso: 0.2 },
  ],
  reclamo_farmacia: [
    { raiz: 'reclam', peso: 0.75 },
    { raiz: 'recog', peso: 0.4 },
    // "farmacia" sola es ambigua a propósito (comparte con
    // farmacias_eps) — no decide nada por sí sola.
    { raiz: 'farmaci', peso: 0.2 },
  ],
  copago_eps: [
    { raiz: 'copago', peso: 0.75 },
    { raiz: 'moderador', peso: 0.6 },
  ],
  farmacias_eps: [
    { raiz: 'farmaci', peso: 0.4 },
    { raiz: 'droguer', peso: 0.7 },
    { raiz: 'aliad', peso: 0.7 },
    { raiz: 'afiliad', peso: 0.7 },
    { raiz: 'eps', peso: 0.3 },
    { raiz: 'asignad', peso: 0.4 },
  ],
  novedad_pedido: [
    { raiz: 'novedad', peso: 0.75 },
    // "demora"/"demorado"/"atrasado" son comunes en reclamos reales
    // sobre un pedido en curso.
    { raiz: 'demor', peso: 0.6 },
    { raiz: 'atrasa', peso: 0.6 },
  ],
  codigo_entrega: [
    { raiz: 'codigo', peso: 0.75 },
    { raiz: 'entreg', peso: 0.2 },
  ],
  pos_no_pos: [{ raiz: 'mipres', peso: 0.8 }],
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class KeywordIntencionMatcherAdapter extends IntencionMatcherPort {
  clasificar(mensaje: string): ResultadoClasificacion {
    const [mejor] = this.clasificarCandidatos(mensaje);
    return mejor ?? { intencion: 'desconocido', score: 0 };
  }

  clasificarCandidatos(mensaje: string): ResultadoClasificacion[] {
    const normalizado = normalizar(mensaje);
    const tokens = normalizado.split(' ').filter(Boolean);

    const resultados: ResultadoClasificacion[] = [];

    for (const intencion of Object.keys(DISPARADORES) as Exclude<
      IntencionChatbot,
      'desconocido'
    >[]) {
      let score = 0;

      for (const { frase, peso } of DISPARADORES[intencion]) {
        // Bug real: las frases disparadoras con tildes/"ñ" (ej.
        // "contraseña") nunca matcheaban contra el mensaje ya
        // normalizado (que SÍ les quita la tilde) — se normaliza la
        // frase disparadora también, no solo el mensaje de entrada.
        if (normalizado.includes(normalizar(frase))) {
          score += peso;
        }
      }

      for (const { raiz, peso } of RAICES[intencion]) {
        if (tokens.some((token) => token.startsWith(raiz))) {
          score += peso;
        }
      }

      score = Math.min(1, score);

      if (score > 0) {
        resultados.push({ intencion, score });
      }
    }

    // Orden estable (V8 garantiza estabilidad en Array.sort desde
    // ES2019): entre dos intenciones con el mismo score, gana la que
    // apareció primero en DISPARADORES — igual que el `score >
    // mejorScore` estricto que tenía la versión anterior de este
    // método.
    return resultados.sort((a, b) => b.score - a.score);
  }
}
