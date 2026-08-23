/** G04/G05/G06 — no existe una solicitud propia con ese id en el estado
 * requerido para la acción (ya fue enviada/cancelada, o el id no
 * corresponde a una solicitud del paciente autenticado). */
export class SolicitudNoEncontradaError extends Error {
  constructor() {
    super('No se encontró la solicitud, o ya no admite esta acción.');
    this.name = 'SolicitudNoEncontradaError';
  }
}
