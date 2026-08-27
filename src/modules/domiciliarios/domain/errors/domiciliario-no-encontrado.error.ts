/** G03/G04 — no existe una cuenta DOMICILIARIO con validación
 * pendiente para ese id (ya fue decidida antes, o el id no corresponde
 * a un domiciliario). */
export class DomiciliarioNoEncontradoError extends Error {
  constructor() {
    super(
      'No hay una solicitud de validación pendiente para ese domiciliario.',
    );
    this.name = 'DomiciliarioNoEncontradoError';
  }
}
