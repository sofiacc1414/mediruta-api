/** El microservicio de OCR rechazó el archivo (formato no soportado,
 * tamaño excesivo, MIME real distinto del declarado) — HTTP 400. */
export class ArchivoFormulaInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
  }
}
