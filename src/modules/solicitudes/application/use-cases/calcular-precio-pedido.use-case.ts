import { Injectable } from '@nestjs/common';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export type PrecioPedido =
  | {
      disponible: true;
      copago: number;
      domicilio: number;
      total: number;
      distanciaKm: number;
    }
  | {
      disponible: false;
      /** `sin_nivel_copago` — el Paciente todavía no eligió su nivel en
       * el perfil. `sin_ubicaciones` — falta geocodificar la farmacia
       * y/o la entrega (Nominatim no las resolvió, o el pedido
       * todavía no se envió). */
      motivo: 'sin_nivel_copago' | 'sin_ubicaciones';
    };

export type ParametrosCalculoPrecio = {
  copago: number | null;
  distanciaMetros: number | null;
  tarifaBaseDomicilio: number;
  tarifaPorKm: number;
  tarifaPorMinuto: number;
  tiempoBaseFarmaciaMin: number;
  velocidadPromedioKmh: number;
  distanciaIncluidaKm: number;
  tarifaPorKmExcedente: number;
};

/**
 * Precio = copago del nivel autodeclarado por el Paciente + costo de
 * domicilio. El copago real de EPS es un % de una tarifa privada
 * EPS-IPS que MediRuta no tiene forma de conocer — este es un modelo
 * propio, simplificado (ver migración `precio_pedido_copago`).
 *
 * Costo de domicilio:
 *   tiempo_min = tiempo_base_farmacia + (distancia_km / velocidad_promedio_kmh) × 60
 *   domicilio  = tarifa_base + (tarifa_por_km × distancia_km) + (tarifa_por_minuto × tiempo_min)
 *                + max(0, distancia_km − distancia_incluida_km) × tarifa_por_km_excedente
 *
 * El tiempo se deriva de la distancia real (no hay una fuente de datos
 * de tiempo de viaje aparte) más un tiempo fijo que cubre la diligencia
 * en la farmacia. El excedente evita que un domicilio larguísimo salga
 * gratis por un cálculo lineal sin ningún ajuste.
 *
 * Función pura, sin acceso a datos — la comparten
 * `CalcularPrecioPedidoUseCase` (precio de una solicitud ya guardada,
 * distancia sacada de `farmacia_ubicacion`/`entrega_ubicacion` vía
 * PostGIS) y `EstimarPrecioPedidoUseCase` (estimado en vivo mientras el
 * Paciente arma el borrador, distancia geocodificada al vuelo) — mismo
 * cálculo, una sola fuente de verdad para la plata.
 */
export function calcularPrecioDesdeParametros(
  datos: ParametrosCalculoPrecio,
): PrecioPedido {
  if (datos.copago === null) {
    return { disponible: false, motivo: 'sin_nivel_copago' };
  }
  if (datos.distanciaMetros === null) {
    return { disponible: false, motivo: 'sin_ubicaciones' };
  }

  const distanciaKm = datos.distanciaMetros / 1000;
  const tiempoMin =
    datos.tiempoBaseFarmaciaMin +
    (distanciaKm / datos.velocidadPromedioKmh) * 60;
  const excedenteKm = Math.max(0, distanciaKm - datos.distanciaIncluidaKm);

  const domicilio =
    datos.tarifaBaseDomicilio +
    datos.tarifaPorKm * distanciaKm +
    datos.tarifaPorMinuto * tiempoMin +
    excedenteKm * datos.tarifaPorKmExcedente;

  return {
    disponible: true,
    copago: datos.copago,
    domicilio: Math.round(domicilio),
    total: Math.round(datos.copago + domicilio),
    distanciaKm: Math.round(distanciaKm * 10) / 10,
  };
}

@Injectable()
export class CalcularPrecioPedidoUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
  ): Promise<PrecioPedido | null> {
    const datos = await this.solicitudes.obtenerDatosPrecioPedido(
      pacienteId,
      solicitudId,
    );
    if (!datos) {
      return null;
    }
    return calcularPrecioDesdeParametros(datos);
  }
}
