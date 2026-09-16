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
 * domiciliario seguía viendo la distancia a la dirección anterior.
 *
 * Ronda 9 — bug real reportado: lo mismo pasaba con `entrega_ubicacion`
 * cuando la edición cambiaba la dirección de ENTREGA. Como el precio del
 * pedido se calcula en vivo con la distancia farmacia↔entrega, dejar
 * `entrega_ubicacion` sin actualizar hacía que el precio quedara
 * calculado contra la dirección vieja aunque el texto ya mostrara la
 * nueva. Mismo tratamiento que farmacia: se geocodifica solo si la
 * edición la cambia, y si Nominatim no la resuelve, la edición se
 * aplica igual sin bloquear la aprobación. */
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

    const [farmacia, entrega] = await Promise.all([
      this.geocodificarSiHay(
        datos?.direccionFarmacia ?? null,
        datos?.ciudad ?? null,
        datos?.departamento ?? null,
      ),
      this.geocodificarSiHay(
        datos?.direccionEntrega ?? null,
        datos?.ciudad ?? null,
        datos?.departamento ?? null,
      ),
    ]);

    const resultado = await this.solicitudes.aprobarEdicionPedidoAdmin(
      adminId,
      novedadId,
      farmacia.lat,
      farmacia.lng,
      entrega.lat,
      entrega.lng,
    );

    if (resultado === 'no_encontrado') {
      throw new NovedadNoEncontradaError();
    }

    return { message: MENSAJE_EDICION_APROBADA };
  }

  private async geocodificarSiHay(
    direccion: string | null,
    ciudad: string | null,
    departamento: string | null,
  ): Promise<{ lat: number | null; lng: number | null }> {
    if (!direccion) {
      return { lat: null, lng: null };
    }
    const coordenadas = await this.geocodificacion.geocodificar(
      direccion,
      ciudad,
      departamento,
    );
    return { lat: coordenadas?.lat ?? null, lng: coordenadas?.lng ?? null };
  }
}
