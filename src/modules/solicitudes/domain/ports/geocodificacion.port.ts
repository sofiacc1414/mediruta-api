export type Coordenadas = {
  lat: number;
  lng: number;
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
