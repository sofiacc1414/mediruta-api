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
const USER_AGENT = 'MediRuta/1.0 (+https://github.com/sofiacc1414/mediruta-api)';
const INTERVALO_MINIMO_MS = 1100;

type ResultadoNominatim = { lat: string; lon: string };

// Nominatim no resuelve direcciones colombianas que escriben el
// numeral como palabra ("num", "número", "no.", "n.", "nro") en vez de
// "#" — visto en vivo: "Calle 38 Sur num 77-100" da 0 resultados, pero
// la misma dirección con "#" geocodifica bien (mismo lat/lng). Se
// normaliza antes de consultar en vez de asumir que el paciente va a
// escribir "#" a mano. "número"/"numero" ya cubre con y sin tilde (el
// alternativo u|ú). "n." exige el punto pegado — sin eso "n" sola
// colisionaría con inicios de palabra como "Norte".
const PATRON_NUMERAL = /\bn(u|ú)mero\b\.?|\bn(u|ú)m\b\.?|\bnro\b\.?|\bno\b\.|\bn\./gi;

export function normalizarDireccion(direccion: string): string {
  return direccion.replace(PATRON_NUMERAL, '#').replace(/\s+/g, ' ').trim();
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
    const consulta = [normalizarDireccion(direccion), ciudad, departamento, 'Colombia']
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .join(', ');

    if (!consulta) {
      return null;
    }

    await this.esperarTurno();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', consulta);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'co');

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

      const resultados = (await respuesta.json()) as ResultadoNominatim[];
      if (resultados.length === 0) {
        return null;
      }

      return { lat: Number(resultados[0].lat), lng: Number(resultados[0].lon) };
    } catch (error) {
      this.logger.warn(
        `No se pudo geocodificar una dirección: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async esperarTurno(): Promise<void> {
    const espera = this.ultimaLlamadaEn + INTERVALO_MINIMO_MS - Date.now();
    if (espera > 0) {
      await new Promise((resolve) => setTimeout(resolve, espera));
    }
    this.ultimaLlamadaEn = Date.now();
  }
}
