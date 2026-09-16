import { Injectable, Logger } from '@nestjs/common';
import {
  Coordenadas,
  GeocodificacionPort,
} from '../../domain/ports/geocodificacion.port';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Términos de uso de Nominatim (OpenStreetMap): User-Agent
// identificable — sin esto responden con error — y máximo 1 request
// por segundo. Acá el volumen es bajísimo (solo al enviar una
// solicitud, no en cada request de la API), pero igual se respeta la
// cola mínima en vez de asumir que nunca se van a superponer dos
// llamadas.
const USER_AGENT =
  'MediRuta/1.0 (+https://github.com/sofiacc1414/mediruta-api)';
const INTERVALO_MINIMO_MS = 1100;
// Ronda 11 — se piden varias coincidencias (no solo la primera) para
// poder ofrecerlas como candidatos alternos cuando la elegida no es
// precisa. Mismo request, sin costo extra de rate limit.
const LIMITE_RESULTADOS = 5;

type ResultadoNominatim = {
  lat: string;
  lon: string;
  addresstype?: string;
  address?: { house_number?: string };
  display_name?: string;
};

// Bug real reportado: la dirección de farmacia/entrega aceptaba
// lugares/instituciones ("Universidad de Medellín") en vez de una
// dirección puntual entregable.
//
// Primera versión RECHAZABA estos casos (devolvía null, sin lat/lng).
// Dos problemas encontrados probando en vivo, en ese orden:
//
// 1. Filtrar solo por `addresstype` (amenity/shop/etc.) rechazaba de
//    más: "Centro Comercial El Tesoro" o "Universidad Pontificia
//    Bolivariana" SÍ traen un house_number preciso ("1 Sur - 45",
//    "70 - 01") — perfectamente entregables, Nominatim los categoriza
//    igual que a "Universidad de Medellín" (que sí carece de
//    house_number) por compartir addresstype, sin que eso diga nada
//    de si hay o no una dirección puntual.
// 2. Rechazar del todo (devolver null) los que sí carecen de
//    house_number tira a la basura un dato real y útil: el lat/lng
//    que Nominatim devuelve para "Universidad de Medellín" es el
//    centro real del campus, navegable de verdad — mucho mejor que no
//    tener ninguna ubicación. Sin este punto, el pedido queda sin
//    poder calcular precio ni entrar al pool de Domiciliarios por
//    cercanía; con el punto (aunque impreciso), sigue funcionando.
//
// Por eso ya NO se rechaza nada acá — se marca `precisa: false` y
// quien llama decide qué hacer con eso (ej. mostrarle un aviso al
// Paciente para que agregue más detalle, sin bloquear el envío).
const TIPOS_LUGAR_SIN_NUMERO_IMPRECISOS = new Set([
  'amenity',
  'shop',
  'tourism',
  'leisure',
  'office',
  'historic',
  'building',
]);

// Nominatim no resuelve direcciones colombianas que escriben el
// numeral como palabra ("num", "número", "no.", "n.", "nro") en vez de
// "#" — visto en vivo: "Calle 38 Sur num 77-100" da 0 resultados, pero
// la misma dirección con "#" geocodifica bien (mismo lat/lng). Se
// normaliza antes de consultar en vez de asumir que el paciente va a
// escribir "#" a mano. "número"/"numero" ya cubre con y sin tilde (el
// alternativo u|ú). "n." exige el punto pegado — sin eso "n" sola
// colisionaría con inicios de palabra como "Norte".
const PATRON_NUMERAL =
  /\bn(u|ú)mero\b\.?|\bn(u|ú)m\b\.?|\bnro\b\.?|\bno\b\.|\bn\./gi;

export function normalizarDireccion(direccion: string): string {
  return direccion.replace(PATRON_NUMERAL, '#').replace(/\s+/g, ' ').trim();
}

// `display_name` de Nominatim es la dirección completa hasta el país
// ("Universidad Pontificia Bolivariana, 70 - 01, Circular 1, San
// Joaquín, Comuna 11 - Laureles-Estadio, Perímetro Urbano Medellín,
// Medellín, Valle de Aburrá, Antioquia, RAP del Agua y la Montaña,
// 050031, Colombia") — demasiado largo y con ruido administrativo para
// mostrárselo al Paciente. Los primeros 3 segmentos ya alcanzan para
// que reconozca si Nominatim entendió bien: nombre del lugar (si
// aplica) + número + calle, o calle + barrio si no hay nombre de
// lugar.
function direccionResueltaDesde(
  displayName: string | undefined,
  textoOriginal: string,
): string {
  if (!displayName) return textoOriginal;
  const segmentos = displayName
    .split(',')
    .map((segmento) => segmento.trim())
    .filter(Boolean);
  return segmentos.slice(0, 3).join(', ') || textoOriginal;
}

/**
 * Adaptador de geocodificación vía la API pública de Nominatim
 * (OpenStreetMap) — gratis, open source, sin API key. Nunca se llama
 * desde App/Web directo, solo desde casos de uso de la API (mismo
 * patrón que ResendCorreoRecuperacionAdapter). Si la dirección no
 * resuelve o el servicio falla, devuelve `null` en vez de lanzar — la
 * geocodificación es "best effort", quien llama decide si bloquea.
 */
@Injectable()
export class NominatimGeocodificacionAdapter extends GeocodificacionPort {
  private readonly logger = new Logger(NominatimGeocodificacionAdapter.name);
  private ultimaLlamadaEn = 0;

  async geocodificar(
    direccion: string,
    ciudad: string | null,
    departamento: string | null,
  ): Promise<Coordenadas | null> {
    const direccionNormalizada = normalizarDireccion(direccion);
    const consultaAcotada = [direccionNormalizada, ciudad, departamento, 'Colombia']
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .join(', ');

    if (!consultaAcotada) {
      return null;
    }

    const resultadosAcotados = await this.buscar(consultaAcotada);
    if (resultadosAcotados === null) {
      // Error de red/HTTP — no hay nada más que intentar.
      return null;
    }
    if (resultadosAcotados.length > 0) {
      return this.aElegidoConCandidatos(
        resultadosAcotados,
        direccion,
        consultaAcotada,
      );
    }

    // Ronda 11 — bug real reportado: "no se está ubicando ninguna
    // dirección". La ciudad/departamento del PERFIL del Paciente se
    // pega a la búsqueda para acotarla (ver `ParametrosEstimacionPrecio`),
    // pero un Paciente registrado en un municipio (ej. Amagá) puede
    // estar pidiendo desde otro (ej. Medellín) — Nominatim, al recibir
    // una calle real pegada a una ciudad donde esa calle NO existe
    // (ej. "Carrera 43A #5A-113, Amagá, Antioquia"), no devuelve una
    // aproximación: devuelve CERO resultados. Antes, esto terminaba en
    // un fallo total sin ninguna sugerencia (ni siquiera el modal de
    // candidatos, que solo se armaba a partir de la MISMA búsqueda
    // acotada). Ahora, si la búsqueda acotada no encuentra nada, se
    // reintenta sin ciudad/departamento — y si esa sí encuentra algo,
    // se ofrece como candidato (nunca como "precisa", porque no se
    // pudo confirmar dentro de la ciudad esperada del Paciente) en vez
    // de fallar en silencio.
    if (!ciudad && !departamento) {
      return null;
    }
    const consultaAmplia = [direccionNormalizada, 'Colombia']
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .join(', ');
    const resultadosAmplios = await this.buscar(consultaAmplia);
    if (!resultadosAmplios || resultadosAmplios.length === 0) {
      return null;
    }

    this.logger.warn(
      `"${consultaAcotada}" no dio resultados, pero sin la ciudad/departamento del perfil sí ("${consultaAmplia}") — se ofrece como candidato sin confirmar.`,
    );
    const [resultado, ...resto] = resultadosAmplios;
    const elegido = this.aCoordenadas(resultado, direccion, consultaAmplia);
    // Forzado a impreciso aunque tenga house_number: nunca se confirmó
    // que esté en la ciudad que el Paciente tiene registrada. Va ANTES
    // de armar `candidatos` (que solo se ofrecen cuando `!precisa`).
    elegido.precisa = false;
    if (resto.length > 0) {
      elegido.candidatos = resto.map((candidato) =>
        this.aCoordenadas(candidato, direccion, consultaAmplia),
      );
    }
    return elegido;
  }

  /** Arma el resultado elegido (el primero) + sus candidatos alternos
   * (el resto), si la elección no quedó precisa — ver `Coordenadas`. */
  private aElegidoConCandidatos(
    resultados: ResultadoNominatim[],
    direccionOriginal: string,
    consulta: string,
  ): Coordenadas {
    const [resultado, ...resto] = resultados;
    const elegido = this.aCoordenadas(resultado, direccionOriginal, consulta);

    if (!elegido.precisa && resto.length > 0) {
      elegido.candidatos = resto.map((candidato) =>
        this.aCoordenadas(candidato, direccionOriginal, consulta),
      );
    }

    return elegido;
  }

  /** `null` = falló la consulta (red/HTTP, no hay más que intentar).
   * `[]` = Nominatim respondió pero sin coincidencias (sí vale la pena
   * reintentar con una consulta más amplia). */
  private async buscar(
    consulta: string,
  ): Promise<ResultadoNominatim[] | null> {
    await this.esperarTurno();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(LIMITE_RESULTADOS));
    url.searchParams.set('countrycodes', 'co');
    // Necesario para leer `address.house_number` — ver el criterio de
    // rechazo más abajo.
    url.searchParams.set('addressdetails', '1');

    try {
      const respuesta = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!respuesta.ok) {
        this.logger.warn(
          `Nominatim respondió ${respuesta.status} para una dirección — se envía sin ubicación de farmacia.`,
        );
        return null;
      }

      return (await respuesta.json()) as ResultadoNominatim[];
    } catch (error) {
      this.logger.warn(
        `No se pudo geocodificar una dirección: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private aCoordenadas(
    resultado: ResultadoNominatim,
    direccionOriginal: string,
    consultaCompleta: string,
  ): Coordenadas {
    const tieneHouseNumber = !!resultado.address?.house_number;
    const esLugarSinNumero =
      !tieneHouseNumber &&
      !!resultado.addresstype &&
      TIPOS_LUGAR_SIN_NUMERO_IMPRECISOS.has(resultado.addresstype);

    if (esLugarSinNumero) {
      this.logger.warn(
        `Nominatim resolvió "${consultaCompleta}" como un lugar sin dirección puntual (addresstype="${resultado.addresstype}", sin house_number) — se usa el punto igual, marcado como impreciso.`,
      );
    }

    return {
      lat: Number(resultado.lat),
      lng: Number(resultado.lon),
      direccionResuelta: direccionResueltaDesde(
        resultado.display_name,
        direccionOriginal,
      ),
      precisa: !esLugarSinNumero,
    };
  }

  private async esperarTurno(): Promise<void> {
    const espera = this.ultimaLlamadaEn + INTERVALO_MINIMO_MS - Date.now();
    if (espera > 0) {
      await new Promise((resolve) => setTimeout(resolve, espera));
    }
    this.ultimaLlamadaEn = Date.now();
  }
}
