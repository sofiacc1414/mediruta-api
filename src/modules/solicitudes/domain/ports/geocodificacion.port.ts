export type Coordenadas = {
  lat: number;
  lng: number;
  /** Ronda 9 — la dirección tal como Nominatim la entendió, para que
   * el Paciente la vea y confirme antes de enviar (mitiga el caso real
   * de que una búsqueda ambigua devuelva el lugar equivocado — ej.
   * "Parque Simón Bolívar" resolviendo a un parque infantil distinto
   * en otro barrio). Cuando el resultado es un lugar con nombre
   * (universidad, centro comercial), ya viene con el nombre adelante —
   * "Universidad Pontificia Bolivariana, 70 - 01, Circular 1" — no
   * solo la calle sola. */
  direccionResuelta: string;
  /** `false` cuando el resultado es un lugar/institución grande sin un
   * número de dirección puntual (ej. "Universidad de Medellín": el
   * lat/lng es el centro real del campus, pero no hay forma de saber
   * en qué entrada puntual — la calle que Nominatim conoce puede ser
   * larguísima, ej. toda la Avenida El Poblado). El punto SIGUE siendo
   * el mejor dato disponible — no se descarta, esto es solo una
   * bandera para que quien consuma esto pueda avisarle al usuario en
   * vez de tratarlo como una dirección exacta. `true` en cualquier
   * otro caso (incluye direcciones de calle sin house_number mapeado —
   * frecuente en Colombia y no es señal de imprecisión real, solo un
   * hueco de datos de OpenStreetMap). */
  precisa: boolean;
};

/**
 * Puerto de geocodificación (dirección de texto → lat/lng) — HU-09. El
 * dominio no sabe que existe Nominatim/OpenStreetMap, solo este
 * contrato. Devuelve `null` cuando la dirección no se pudo resolver
 * (no es una excepción: quien llama decide si eso bloquea o no — para
 * "enviar solicitud" no bloquea, el pedido se envía igual sin
 * ubicación de farmacia).
 */
export abstract class GeocodificacionPort {
  abstract geocodificar(
    direccion: string,
    ciudad: string | null,
    departamento: string | null,
  ): Promise<Coordenadas | null>;
}
