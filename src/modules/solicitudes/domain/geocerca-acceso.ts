/** Radio alrededor de la farmacia para ver documentos en la recogida. */
export const RADIO_ACCESO_FARMACIA_METROS = 150;

/** La URL firmada y la fila de acceso vencen juntas. */
export const ACCESO_TEMPORAL_SEGUNDOS = 600;

export const MENSAJE_FUERA_DE_UBICACION =
  'No tienes acceso a los documentos porque no estás exactamente en la dirección autorizada de la farmacia.';

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
