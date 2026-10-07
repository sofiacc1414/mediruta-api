/** Radio alrededor de la farmacia para ver documentos en la recogida.
 * Antes 150m, luego 300m — pedido explícito: ampliar más para espacios
 * amplios (centros comerciales, clínicas con farmacia interna, campus
 * universitarios), donde el GPS del domiciliario cae fuera del radio
 * aunque esté físicamente parado en el local. */
export const RADIO_ACCESO_FARMACIA_METROS = 500;

/** La URL firmada y la fila de acceso vencen juntas. */
export const ACCESO_TEMPORAL_SEGUNDOS = 600;

// Bug real reportado: el mensaje no explicaba la causa (no mencionaba
// "fuera de la cerca/rango") — el domiciliario no entendía por qué se
// le negaba el acceso estando en la farmacia.
export const MENSAJE_FUERA_DE_UBICACION =
  'No tienes acceso a los documentos porque tu ubicación actual está fuera del rango permitido alrededor de la farmacia (estás fuera de la cerca). Acércate más a la entrada y volvé a intentar.';

const RADIO_TIERRA_METROS = 6_371_000;

export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const aLat = aRadianes(lat2 - lat1);
  const aLng = aRadianes(lng2 - lng1);
  const h =
    Math.sin(aLat / 2) ** 2 +
    Math.cos(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.sin(aLng / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function dentroDeGeocerca(
  lat: number | null | undefined,
  lng: number | null | undefined,
  farmaciaLat: number | null,
  farmaciaLng: number | null,
  radioMetros = RADIO_ACCESO_FARMACIA_METROS,
): boolean {
  if (
    lat == null ||
    lng == null ||
    farmaciaLat == null ||
    farmaciaLng == null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return false;
  }
  return distanciaMetros(lat, lng, farmaciaLat, farmaciaLng) <= radioMetros;
}

export function accesoExpirado(expiraEn: Date, ahora: Date): boolean {
  return expiraEn.getTime() <= ahora.getTime();
}

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}
