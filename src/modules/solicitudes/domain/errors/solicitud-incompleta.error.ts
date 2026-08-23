/** G05 — se intentó enviar una solicitud a la que le faltan campos
 * obligatorios. `faltantes` lista qué requisitos faltan, para que la App
 * los muestre tal cual. */
export class SolicitudIncompletaError extends Error {
  constructor(public readonly faltantes: string[]) {
    super('La solicitud está incompleta.');
    this.name = 'SolicitudIncompletaError';
  }
}
