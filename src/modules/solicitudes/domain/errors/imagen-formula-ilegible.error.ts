/** CA3 del Módulo 1 (OCR): el microservicio detectó una confianza de
 * lectura < 75% — HTTP 422. El mensaje ya viene en español listo para
 * mostrarle al paciente, no es un detalle técnico interno. */
export class ImagenFormulaIlegibleError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
  }
}
