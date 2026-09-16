import { Injectable } from '@nestjs/common';
import {
  CandidatoDireccion,
  GeocodificacionPort,
} from '../../domain/ports/geocodificacion.port';
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
 * punto sigue siendo válido, solo aproximado.
 *
 * Ronda 11 — `direccionXCandidatos` trae otras coincidencias que
 * Nominatim devolvió para la misma búsqueda, solo cuando la elegida
 * quedó `precisa: false` (bug real: un Paciente registrado en un
 * municipio puede estar pidiendo desde otro — el primer resultado no
 * siempre es el correcto). La App las ofrece en un modal para que el
 * Paciente elija en vez de quedarse con la aproximación automática. */
export type EstimacionPrecioPedido = PrecioPedido & {
  direccionFarmaciaResuelta: string | null;
  direccionFarmaciaPrecisa: boolean;
  direccionFarmaciaCandidatos: CandidatoDireccion[];
  direccionEntregaResuelta: string | null;
  direccionEntregaPrecisa: boolean;
  direccionEntregaCandidatos: CandidatoDireccion[];
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

    // Ronda 10 — bug real: esto se cortaba ACÁ si el Paciente todavía
    // no había elegido nivel de copago, así que la confirmación de
    // dirección (lo único que la App necesita mostrar bajo cada campo)
    // nunca llegaba a calcularse para alguien armando su primer
    // pedido. Geocodificar es independiente de tener o no copago — se
    // separa: primero se geocodifica siempre que haya texto en los dos
    // campos, y solo el PRECIO queda condicionado al copago.
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

    const direccionFarmaciaResuelta = farmacia?.direccionResuelta ?? null;
    const direccionFarmaciaPrecisa = farmacia?.precisa ?? true;
    const direccionFarmaciaCandidatos = farmacia?.candidatos ?? [];
    const direccionEntregaResuelta = entrega?.direccionResuelta ?? null;
    const direccionEntregaPrecisa = entrega?.precisa ?? true;
    const direccionEntregaCandidatos = entrega?.candidatos ?? [];

    if (parametros.copago === null) {
      return {
        disponible: false,
        motivo: 'sin_nivel_copago',
        direccionFarmaciaResuelta,
        direccionFarmaciaPrecisa,
        direccionFarmaciaCandidatos,
        direccionEntregaResuelta,
        direccionEntregaPrecisa,
        direccionEntregaCandidatos,
      };
    }

    const distanciaMetros =
      farmacia && entrega ? distanciaMetrosEntre(farmacia, entrega) : null;

    return {
      ...calcularPrecioDesdeParametros({
        ...parametros,
        distanciaMetros,
      }),
      direccionFarmaciaResuelta,
      direccionFarmaciaPrecisa,
      direccionFarmaciaCandidatos,
      direccionEntregaResuelta,
      direccionEntregaPrecisa,
      direccionEntregaCandidatos,
    };
  }
}
