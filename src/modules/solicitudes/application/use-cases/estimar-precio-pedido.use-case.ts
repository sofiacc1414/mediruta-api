import { Injectable } from '@nestjs/common';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  calcularPrecioDesdeParametros,
  PrecioPedido,
} from './calcular-precio-pedido.use-case';

const RADIO_TIERRA_METROS = 6371000;

/** Distancia en línea recta entre dos puntos — misma idea que
 * `public.st_distance` sobre `geography` en PostGIS (que usa una
 * esfera, no simplemente Pitágoras en lat/lng), pero calculada acá
 * porque estos dos puntos no salen de una fila de `solicitudes`: son
 * el resultado de geocodificar en vivo lo que el Paciente va
 * escribiendo, antes de que exista ninguna solicitud guardada. */
function distanciaMetrosEntre(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const deltaLat = radianes(b.lat - a.lat);
  const deltaLng = radianes(b.lng - a.lng);
  const senoDeltaLat = Math.sin(deltaLat / 2);
  const senoDeltaLng = Math.sin(deltaLng / 2);
  const h =
    senoDeltaLat * senoDeltaLat +
    Math.cos(radianes(a.lat)) *
      Math.cos(radianes(b.lat)) *
      senoDeltaLng *
      senoDeltaLng;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(h));
}

/** Ronda 9 — además del precio, la dirección tal como Nominatim la
 * entendió (`direccionResuelta` de cada `Coordenadas`) para que la App
 * se la muestre al Paciente como confirmación antes de enviar. Bug
 * real que motiva esto: una búsqueda ambigua puede resolver al lugar
 * equivocado (ej. "Parque Simón Bolívar" → un parque infantil
 * distinto en otro barrio) sin que nada en el precio lo delate —
 * mostrar la dirección resuelta es la forma de que el Paciente lo
 * note y corrija antes de enviar.
 *
 * `direccionXResuelta` es `null` solo si esa dirección todavía no se
 * pudo geocodificar (typo, dirección incompleta mientras escribe, o
 * Nominatim/red caídos). `direccionXPrecisa` en `false` significa que
 * SÍ se geocodificó pero es un lugar grande sin punto de entrega
 * exacto (ej. "Universidad de Medellín") — la App puede usar esto para
 * sugerirle al Paciente agregar más detalle, sin bloquear el envío: el
 * punto sigue siendo válido, solo aproximado. */
export type EstimacionPrecioPedido = PrecioPedido & {
  direccionFarmaciaResuelta: string | null;
  direccionFarmaciaPrecisa: boolean;
  direccionEntregaResuelta: string | null;
  direccionEntregaPrecisa: boolean;
};

/**
 * Estimado en vivo mientras el Paciente arma el borrador (App:
 * NuevaSolicitudScreen), antes de enviar el pedido — sin esto, el
 * precio recién se veía después de haber enviado, porque el cálculo
 * "real" (`CalcularPrecioPedidoUseCase`) depende de columnas que solo
 * se llenan al enviar. Mismo motivo `sin_ubicaciones` que el cálculo
 * real si Nominatim no resuelve alguna de las dos direcciones (acá,
 * porque el Paciente todavía no terminó de escribirla o tiene un
 * typo, no porque falte enviar).
 */
@Injectable()
export class EstimarPrecioPedidoUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly geocodificacion: GeocodificacionPort,
  ) {}

  async execute(
    pacienteId: string,
    direccionFarmacia: string,
    direccionEntrega: string,
  ): Promise<EstimacionPrecioPedido | null> {
    const parametros =
      await this.solicitudes.obtenerParametrosEstimacionPrecio(pacienteId);
    if (!parametros) {
      return null;
    }

    if (parametros.copago === null) {
      return {
        disponible: false,
        motivo: 'sin_nivel_copago',
        direccionFarmaciaResuelta: null,
        direccionFarmaciaPrecisa: true,
        direccionEntregaResuelta: null,
        direccionEntregaPrecisa: true,
      };
    }

    const [farmacia, entrega] = await Promise.all([
      this.geocodificacion.geocodificar(
        direccionFarmacia,
        parametros.ciudad,
        parametros.departamento,
      ),
      this.geocodificacion.geocodificar(
        direccionEntrega,
        parametros.ciudad,
        parametros.departamento,
      ),
    ]);

    const distanciaMetros =
      farmacia && entrega ? distanciaMetrosEntre(farmacia, entrega) : null;

    return {
      ...calcularPrecioDesdeParametros({
        ...parametros,
        distanciaMetros,
      }),
      direccionFarmaciaResuelta: farmacia?.direccionResuelta ?? null,
      direccionFarmaciaPrecisa: farmacia?.precisa ?? true,
      direccionEntregaResuelta: entrega?.direccionResuelta ?? null,
      direccionEntregaPrecisa: entrega?.precisa ?? true,
    };
  }
}
