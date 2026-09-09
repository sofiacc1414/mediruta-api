import { Injectable } from '@nestjs/common';
import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_EDICION_APROBADA = 'Corrección aplicada al pedido.';

/** HU-07 (ronda 3) — el Administrador aprueba una novedad de tipo
 * 'edicion': aplica los datos propuestos al pedido y cierra la
 * novedad.
 *
 * Ronda 8 — si la edición cambia la dirección de la farmacia, la
 * geocodifica antes de aplicar (mismo patrón que `EnviarSolicitudUseCase`,
 * HU-09) para que `farmacia_ubicacion` quede al día — si no, el
 * domiciliario seguía viendo la distancia a la dirección anterior. Si
 * Nominatim no la resuelve, la edición se aplica igual, sin actualizar
 * la ubicación (no bloquea la aprobación). */
@Injectable()
export class AprobarEdicionPedidoAdminUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly geocodificacion: GeocodificacionPort,
  ) {}

  async execute(
    adminId: string,
    novedadId: string,
  ): Promise<{ message: string }> {
    const datos =
      await this.solicitudes.obtenerDatosGeocodificacionNovedadAdmin(
        adminId,
        novedadId,
      );

    let farmaciaLat: number | null = null;
    let farmaciaLng: number | null = null;
    if (datos?.direccionFarmacia) {
      const coordenadas = await this.geocodificacion.geocodificar(
        datos.direccionFarmacia,
        datos.ciudad,
        datos.departamento,
      );
      farmaciaLat = coordenadas?.lat ?? null;
      farmaciaLng = coordenadas?.lng ?? null;
    }

    const resultado = await this.solicitudes.aprobarEdicionPedidoAdmin(
      adminId,
      novedadId,
      farmaciaLat,
      farmaciaLng,
    );

    if (resultado === 'no_encontrado') {
      throw new NovedadNoEncontradaError();
    }

    return { message: MENSAJE_EDICION_APROBADA };
  }
}
