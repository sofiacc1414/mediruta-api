/** Ronda 10 — bug real reportado: el perfil dejaba guardar cualquier
 * texto como "dirección de entrega" sin validar nada — a diferencia
 * de las direcciones de un pedido (ver `EnviarSolicitudUseCase`), que
 * sí se geocodifican. Mismo criterio acá: si Nominatim no encuentra
 * NADA (ni siquiera un lugar impreciso), se rechaza el guardado antes
 * de escribir en la base — no tiene sentido dejar guardar una
 * dirección que después va a fallar igual al armar un pedido. */
export class DireccionNoValidaError extends Error {
  constructor() {
    super(
      'No pudimos ubicar esa dirección. Revisala e intentá de nuevo.',
    );
    this.name = 'DireccionNoValidaError';
  }
}
