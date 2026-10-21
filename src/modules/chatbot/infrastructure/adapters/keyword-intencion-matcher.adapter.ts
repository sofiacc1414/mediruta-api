import { Injectable } from '@nestjs/common';
import { IntencionChatbot, ResultadoClasificacion } from '../../domain/intencion-chatbot';
import { IntencionMatcherPort } from '../../domain/ports/intencion-matcher.port';

type Disparador = { frase: string; peso: number };

/** Cada intención tiene frases disparadoras con un peso — frases de
 * 2-4 palabras (más específicas) pesan más que una sola palabra
 * genérica, para que "medicamentos" sola no empate "pedir
 * medicamentos" contra "reclamo de medicamentos". El score de una
 * intención es la suma de pesos de sus frases encontradas como
 * substring del mensaje normalizado, con tope en 1.0. */
const DISPARADORES: Record<Exclude<IntencionChatbot, 'desconocido'>, Disparador[]> = {
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
  ],
  farmacias_eps: [
    { frase: 'farmacias de mi eps', peso: 1 },
    { frase: 'que farmacias trabajan con mi eps', peso: 1 },
    { frase: 'donde reclamo segun mi eps', peso: 1 },
    { frase: 'farmacias aliadas', peso: 0.9 },
    { frase: 'en que droguerias puedo reclamar', peso: 1 },
    { frase: 'farmacias afiliadas a mi eps', peso: 1 },
    { frase: 'cual es la farmacia de mi eps', peso: 1 },
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
  ],
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
    const normalizado = normalizar(mensaje);

    let mejorIntencion: IntencionChatbot = 'desconocido';
    let mejorScore = 0;

    for (const [intencion, disparadores] of Object.entries(DISPARADORES) as [
      Exclude<IntencionChatbot, 'desconocido'>,
      Disparador[],
    ][]) {
      let score = 0;
      for (const { frase, peso } of disparadores) {
        if (normalizado.includes(frase)) {
          score += peso;
        }
      }
      score = Math.min(1, score);

      if (score > mejorScore) {
        mejorScore = score;
        mejorIntencion = intencion;
      }
    }

    return { intencion: mejorIntencion, score: mejorScore };
  }
}
