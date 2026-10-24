import { Injectable } from '@nestjs/common';
import {
  describirCopagoContributivo,
  describirCopagoSubsidiado,
} from '../../domain/copago-regulado';
import {
  IntencionChatbot,
  RangoIngresos,
  UMBRAL_CONFIANZA_MINIMO,
  UMBRAL_SUGERENCIA,
} from '../../domain/intencion-chatbot';
import { ETIQUETAS_INTENCION } from '../../domain/etiquetas-intencion';
import { IntencionMatcherPort } from '../../domain/ports/intencion-matcher.port';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import { RespuestaChatbot, SugerenciaChatbot } from '../../domain/respuesta-chatbot';
import {
  MENSAJE_NO_ENTENDIDO,
  MENSAJE_QUIZAS_TE_REFERIS,
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
  /** La app la manda cuando el paciente toca un botón de sugerencia —
   * se salta la clasificación y se responde directo con esa
   * intención (score 1: el usuario ya confirmó que era lo que quería
   * decir), reenviando el mismo `mensaje` original. */
  intencionForzada?: Exclude<IntencionChatbot, 'desconocido'>;
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
    if (entrada.intencionForzada) {
      return this.responderIntencion(entrada.intencionForzada, 1, entrada);
    }

    const { intencion, score } = this.matcher.clasificar(entrada.mensaje);

    if (score < UMBRAL_CONFIANZA_MINIMO) {
      const sugerencias = this.sugerir(entrada.mensaje);
      const yaFalloAntes = (entrada.intentosSinExitoSeguidos ?? 0) >= 1;
      return {
        intencion: 'desconocido',
        score,
        respuesta: sugerencias
          ? MENSAJE_QUIZAS_TE_REFERIS
          : yaFalloAntes
            ? MENSAJE_SOPORTE_HUMANO
            : MENSAJE_NO_ENTENDIDO,
        requiereDatos: null,
        // Con sugerencias de por medio no se ofrece soporte todavía —
        // primero se le da al usuario la chance de confirmar una opción.
        ofrecerSoporte: !sugerencias && yaFalloAntes,
        sugerencias,
      };
    }

    return this.responderIntencion(intencion, score, entrada);
  }

  /** Candidatos razonables (`UMBRAL_SUGERENCIA` <= score <
   * `UMBRAL_CONFIANZA_MINIMO`) para ofrecer como botones en vez de un
   * "no entendí" plano. Máximo 3, para no saturar la UI. */
  private sugerir(mensaje: string): SugerenciaChatbot[] | null {
    const candidatos = this.matcher
      .clasificarCandidatos(mensaje)
      .filter(
        (c) => c.score >= UMBRAL_SUGERENCIA && c.score < UMBRAL_CONFIANZA_MINIMO,
      )
      .slice(0, 3);

    if (candidatos.length === 0) return null;

    return candidatos.map((c) => ({
      intencion: c.intencion,
      etiqueta: ETIQUETAS_INTENCION[c.intencion] ?? c.intencion,
    }));
  }

  private async responderIntencion(
    intencion: IntencionChatbot,
    score: number,
    entrada: EntradaMensajeChatbot,
  ): Promise<RespuestaChatbot> {
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
      sugerencias: null,
    };
  }

  private responderCopago(
    score: number,
    entrada: EntradaMensajeChatbot,
  ): RespuestaChatbot {
    if (
      !entrada.regimen ||
      (entrada.regimen === 'contributivo' && !entrada.rangoIngresos)
    ) {
      return {
        intencion: 'copago_eps',
        score,
        respuesta:
          '¿Estás en régimen contributivo o subsidiado? Si es contributivo, contame también ' +
          'tu rango de ingresos (menos de 2 SMLV, entre 2 y 5, o más de 5) — el copago lo fija ' +
          'el Gobierno según eso, no según tu EPS.',
        requiereDatos: 'datos_copago',
        ofrecerSoporte: false,
        sugerencias: null,
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
      sugerencias: null,
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
        respuesta:
          'Para esto necesitás iniciar sesión — una vez adentro, preguntame de nuevo.',
        requiereDatos: null,
        ofrecerSoporte: false,
        sugerencias: null,
      };
    }

    if (!entrada.eps) {
      return {
        intencion: 'farmacias_eps',
        score,
        respuesta:
          '¿Cuál es tu EPS? Así te digo qué farmacias trabajan con ella.',
        requiereDatos: 'eps',
        ofrecerSoporte: false,
        sugerencias: null,
      };
    }

    const farmacias = await this.farmacias.listarPorEps(
      entrada.usuarioId,
      entrada.eps,
    );
    if (farmacias.length === 0) {
      return {
        intencion: 'farmacias_eps',
        score,
        respuesta:
          `No tengo farmacias registradas para "${entrada.eps}" todavía. Te recomiendo ` +
          'confirmar directamente con tu EPS cuál te queda más cerca.',
        requiereDatos: null,
        ofrecerSoporte: false,
        sugerencias: null,
      };
    }

    const listado = farmacias
      .map(
        (f) =>
          `• ${f.nombreFarmacia} — ${f.ciudad}${f.direccion ? `, ${f.direccion}` : ''}`,
      )
      .join('\n');
    return {
      intencion: 'farmacias_eps',
      score,
      respuesta: `Farmacias que trabajan con ${entrada.eps}:\n${listado}`,
      requiereDatos: null,
      ofrecerSoporte: false,
      sugerencias: null,
    };
  }
}
