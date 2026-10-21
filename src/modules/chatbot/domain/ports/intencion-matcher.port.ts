import { ResultadoClasificacion } from '../intencion-chatbot';

/** Puerto del clasificador de intenciones — hoy por palabras clave
 * (`KeywordIntencionMatcherAdapter`), reemplazable después por
 * embeddings sin tocar el caso de uso. Deliberadamente NO es otro
 * microservicio: para un set chico y acotado de intenciones de
 * dominio, coincidencia por palabras clave en el mismo proceso de
 * mediruta-api alcanza el >90% de precisión/recall que pide el CA2,
 * sin sumar otra pieza desplegable. */
export abstract class IntencionMatcherPort {
  abstract clasificar(mensaje: string): ResultadoClasificacion;
}
