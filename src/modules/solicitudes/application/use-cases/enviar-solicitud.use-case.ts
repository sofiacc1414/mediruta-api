import { Injectable } from '@nestjs/common';
import { SolicitudIncompletaError } from '../../domain/errors/solicitud-incompleta.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_SOLICITUD_ENVIADA = 'Tu solicitud fue enviada a revisión.';

/** Ronda 14 — bug real reportado: aunque el estimado en vivo ya
 * hubiera confirmado ambas direcciones mientras se armaba el
 * borrador, "Enviar solicitud" las volvía a geocodificar desde cero —
 * un segundo viaje a Nominatim que podía fallar aunque el primero
 * hubiera funcionado, y a diferencia de guardar el perfil, acá SÍ
 * importa: si falla, el pedido se envía igual pero SIN ubicación, en
 * silencio, y queda fuera del pool de Domiciliarios por cercanía.
 *
 * Si la App manda esto y `direccionVerificadaPara` coincide EXACTO
 * con el texto que hay guardado ahora mismo para esa dirección (no se
 * editó después de confirmarla), se usan `lat`/`lng` directo — son
 * las mismas coordenadas reales que ya dio Nominatim, solo que no se
 * vuelven a pedir. Si no coincide (se editó, o nunca se confirmó),
 * se geocodifica como antes. */
export type VerificacionDireccionPrevia = {
  direccionVerificadaPara: string;
  lat: number;
  lng: number;
};

/** G05 — envía a revisión. Si falta algún obligatorio, no cambia nada y
 * lanza SolicitudIncompletaError con el detalle de qué falta.
 *
 * HU-09 — antes de enviar, geocodifica la dirección de la farmacia
 * (usando ciudad/departamento del perfil del paciente como contexto)
 * para que el pedido entre al pool de Domiciliarios ya con ubicación.
 * Si Nominatim no la resuelve, el envío sigue igual — GeocodificacionPort
 * devuelve `null` en vez de lanzar, y `enviar()` acepta lat/lng nulos sin
 * bloquear (el pedido queda sin ordenar por distancia hasta que se
 * resuelva manual, ver plan).
 *
 * Ronda de precio del pedido — también geocodifica la dirección de
 * entrega (antes no se hacía) para poder calcular la distancia real
 * farmacia→entrega y así el costo de domicilio. Mismo criterio que la
 * farmacia: si falla, no bloquea el envío — el precio simplemente
 * queda sin poder calcularse hasta que se resuelva. */
@Injectable()
export class EnviarSolicitudUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly geocodificacion: GeocodificacionPort,
  ) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
    farmaciaVerificada?: VerificacionDireccionPrevia,
    entregaVerificada?: VerificacionDireccionPrevia,
  ): Promise<{ message: string; codigoPedido: string }> {
    const datos = await this.solicitudes.obtenerDatosGeocodificacionFarmacia(
      pacienteId,
      solicitudId,
    );

    const [farmacia, entrega] = await Promise.all([
      this.resolverUbicacion(
        datos?.direccionFarmacia ?? null,
        datos?.ciudad ?? null,
        datos?.departamento ?? null,
        farmaciaVerificada,
      ),
      this.resolverUbicacion(
        datos?.direccionEntrega ?? null,
        datos?.ciudad ?? null,
        datos?.departamento ?? null,
        entregaVerificada,
      ),
    ]);

    const resultado = await this.solicitudes.enviar(
      pacienteId,
      solicitudId,
      farmacia.lat,
      farmacia.lng,
      entrega.lat,
      entrega.lng,
    );

    switch (resultado.resultado) {
      case 'enviada':
        return {
          message: MENSAJE_SOLICITUD_ENVIADA,
          codigoPedido: resultado.codigoPedido,
        };
      case 'incompleta':
        throw new SolicitudIncompletaError(resultado.faltantes);
      case 'no_encontrada':
        throw new SolicitudNoEncontradaError();
    }
  }

  private async resolverUbicacion(
    direccion: string | null,
    ciudad: string | null,
    departamento: string | null,
    verificada: VerificacionDireccionPrevia | undefined,
  ): Promise<{ lat: number | null; lng: number | null }> {
    if (!direccion) {
      return { lat: null, lng: null };
    }
    // La App ya confirmó ESTE texto exacto (no se editó después) —
    // se usan esas coordenadas directo, sin un segundo viaje a
    // Nominatim que podría fallar aunque el primero haya funcionado.
    if (verificada && verificada.direccionVerificadaPara === direccion) {
      return { lat: verificada.lat, lng: verificada.lng };
    }
    const coordenadas = await this.geocodificacion.geocodificar(
      direccion,
      ciudad,
      departamento,
    );
    return { lat: coordenadas?.lat ?? null, lng: coordenadas?.lng ?? null };
  }
}
