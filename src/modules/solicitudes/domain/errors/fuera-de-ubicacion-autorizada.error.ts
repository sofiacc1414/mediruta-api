import { MENSAJE_FUERA_DE_UBICACION } from '../geocerca-acceso';

/** HU-16 G03 — el domiciliario pidió documentos fuera de la geocerca
 * de la farmacia, o sin una ubicación que se pueda comprobar. */
export class FueraDeUbicacionAutorizadaError extends Error {
  constructor() {
    super(MENSAJE_FUERA_DE_UBICACION);
    this.name = 'FueraDeUbicacionAutorizadaError';
  }
}
