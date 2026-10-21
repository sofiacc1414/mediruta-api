import { Injectable } from '@nestjs/common';
import {
  describirCopagoContributivo,
  describirCopagoSubsidiado,
} from '../../domain/copago-regulado';
import { RangoIngresos, UMBRAL_CONFIANZA_MINIMO } from '../../domain/intencion-chatbot';
import { IntencionMatcherPort } from '../../domain/ports/intencion-matcher.port';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import { RespuestaChatbot } from '../../domain/respuesta-chatbot';
import {
  MENSAJE_NO_ENTENDIDO,
  MENSAJE_SOPORTE_HUMANO,
  RESPUESTAS_ESTATICAS,
} from '../../domain/respuestas-estaticas';

export type EntradaMensajeChatbot = {
  /** `null` si pregunta sin haber iniciado sesión (ej. dudas de
   * registro) — ver `OptionalAuthGuard`. */
  usuarioId: string | null;
  mensaje: string;
  eps?: string;
  regimen?: 'contributivo' | 'subsidiado';
  rangoIngresos?: RangoIngresos;
  /** La app lleva la cuenta (el backend queda sin estado de
   * conversación) — cuántas respuestas "no entendí" seguidas lleva
   * ANTES de este mensaje. CA3: en la 2da seguida, se ofrece soporte. */
  intentosSinExitoSeguidos?: number;
};

/** Orquesta: clasificar intención -> si hace falta EPS/datos de
 * copago, pedirlos explícitamente (CA1) -> si no, componer la
 * respuesta real (estática para las FAQ operativas, calculada para
 * copago, consultando el catálogo real para farmacias aliadas). */
@Injectable()
export class ProcesarMensajeChatbotUseCase {
  constructor(
    private readonly matcher: IntencionMatcherPort,
    private readonly farmacias: FarmaciaAliadaRepositoryPort,
  ) {}

  async execute(entrada: EntradaMensajeChatbot): Promise<RespuestaChatbot> {
    const { intencion, score } = this.matcher.clasificar(entrada.mensaje);

    if (score < UMBRAL_CONFIANZA_MINIMO) {
      const yaFalloAntes = (entrada.intentosSinExitoSeguidos ?? 0) >= 1;
      return {
        intencion: 'desconocido',
        score,
        respuesta: yaFalloAntes ? MENSAJE_SOPORTE_HUMANO : MENSAJE_NO_ENTENDIDO,
        requiereDatos: null,
        ofrecerSoporte: yaFalloAntes,
      };
    }

    if (intencion === 'copago_eps') {
      return this.responderCopago(score, entrada);
    }

    if (intencion === 'farmacias_eps') {
      return this.responderFarmacias(score, entrada);
    }

    const respuestaEstatica = RESPUESTAS_ESTATICAS[intencion];
    return {
      intencion,
      score,
      respuesta: respuestaEstatica ?? MENSAJE_NO_ENTENDIDO,
      requiereDatos: null,
      ofrecerSoporte: false,
    };
  }

  private responderCopago(score: number, entrada: EntradaMensajeChatbot): RespuestaChatbot {
    if (!entrada.regimen || (entrada.regimen === 'contributivo' && !entrada.rangoIngresos)) {
      return {
        intencion: 'copago_eps',
        score,
        respuesta:
          '¿Estás en régimen contributivo o subsidiado? Si es contributivo, contame también ' +
          'tu rango de ingresos (menos de 2 SMLV, entre 2 y 5, o más de 5) — el copago lo fija ' +
          'el Gobierno según eso, no según tu EPS.',
        requiereDatos: 'datos_copago',
        ofrecerSoporte: false,
      };
    }

    const respuesta =
      entrada.regimen === 'subsidiado'
        ? describirCopagoSubsidiado()
        : describirCopagoContributivo(entrada.rangoIngresos!);

    return {
      intencion: 'copago_eps',
      score,
      respuesta,
      requiereDatos: null,
      ofrecerSoporte: false,
    };
  }

  private async responderFarmacias(
    score: number,
    entrada: EntradaMensajeChatbot,
  ): Promise<RespuestaChatbot> {
    if (!entrada.usuarioId) {
      return {
        intencion: 'farmacias_eps',
        score,
        respuesta: 'Para esto necesitás iniciar sesión — una vez adentro, preguntame de nuevo.',
        requiereDatos: null,
        ofrecerSoporte: false,
      };
    }

    if (!entrada.eps) {
      return {
        intencion: 'farmacias_eps',
        score,
        respuesta: '¿Cuál es tu EPS? Así te digo qué farmacias trabajan con ella.',
        requiereDatos: 'eps',
        ofrecerSoporte: false,
      };
    }

    const farmacias = await this.farmacias.listarPorEps(entrada.usuarioId, entrada.eps);
    if (farmacias.length === 0) {
      return {
        intencion: 'farmacias_eps',
        score,
        respuesta:
          `No tengo farmacias registradas para "${entrada.eps}" todavía. Te recomiendo ` +
          'confirmar directamente con tu EPS cuál te queda más cerca.',
        requiereDatos: null,
        ofrecerSoporte: false,
      };
    }

    const listado = farmacias
      .map((f) => `• ${f.nombreFarmacia} — ${f.ciudad}${f.direccion ? `, ${f.direccion}` : ''}`)
      .join('\n');
    return {
      intencion: 'farmacias_eps',
      score,
      respuesta: `Farmacias que trabajan con ${entrada.eps}:\n${listado}`,
      requiereDatos: null,
      ofrecerSoporte: false,
    };
  }
}
