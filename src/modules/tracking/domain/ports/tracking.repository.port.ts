export type ResultadoActualizarUbicacion = 'ok' | 'no_autorizado' | 'pedido_no_en_camino';

export type PosicionEnVivo = {
  estado: string;
  domiciliarioLat: number | null;
  domiciliarioLng: number | null;
  ubicacionActualizadaEn: string | null;
  farmaciaLat: number | null;
  farmaciaLng: number | null;
  entregaLat: number | null;
  entregaLng: number | null;
};

export type ResultadoObtenerPosicion =
  | { resultado: 'ok'; posicion: PosicionEnVivo }
  | { resultado: 'no_autorizado' | 'pedido_no_encontrado' | 'sin_tracking_disponible' };

/** Puerto del módulo de tracking en vivo — ver la migración
 * `20260930100000_tracking_en_vivo.sql`. No hay tabla propia: reusa
 * `perfil_domiciliario.ubicacion` como "última posición conocida",
 * mismo criterio que el resto del proyecto (sin historial de
 * trayectoria, ningún criterio de este módulo lo necesita). */
export abstract class TrackingRepositoryPort {
  abstract actualizarUbicacion(
    domiciliarioId: string,
    solicitudId: string,
    lat: number,
    lng: number,
  ): Promise<ResultadoActualizarUbicacion>;

  abstract obtenerPosicion(
    usuarioId: string,
    solicitudId: string,
  ): Promise<ResultadoObtenerPosicion>;
}
