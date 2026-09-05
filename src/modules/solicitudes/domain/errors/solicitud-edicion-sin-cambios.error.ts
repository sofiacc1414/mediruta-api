/** HU-07 (ronda 3) — el Paciente pidió una edición sin proponer ningún
 * cambio (ni dirección de entrega ni de farmacia). */
export class SolicitudEdicionSinCambiosError extends Error {
  constructor() {
    super('Indicá al menos un dato para corregir.');
    this.name = 'SolicitudEdicionSinCambiosError';
  }
}
