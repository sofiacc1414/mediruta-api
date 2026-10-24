import { Injectable } from '@nestjs/common';
import { MedioPagoNoHabilitadoError } from '../../domain/errors/medio-pago-no-habilitado.error';
import { PagoTarjetaRechazadoError } from '../../domain/errors/pago-tarjeta-rechazado.error';
import { PagoTransferenciaRechazadoError } from '../../domain/errors/pago-transferencia-rechazado.error';
import { SolicitudIncompletaError } from '../../domain/errors/solicitud-incompleta.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { PagoTarjetaPort } from '../../domain/ports/pago-tarjeta.port';
import { PagoTransferenciaPort } from '../../domain/ports/pago-transferencia.port';
import {
  MetodoPago,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { calcularPrecioDesdeParametros } from './calcular-precio-pedido.use-case';
import { distanciaMetrosEntre } from './estimar-precio-pedido.use-case';

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
    private readonly pagoTarjeta: PagoTarjetaPort,
    private readonly pagoTransferencia: PagoTransferenciaPort,
  ) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
    farmaciaVerificada?: VerificacionDireccionPrevia,
    entregaVerificada?: VerificacionDireccionPrevia,
    metodoPago: MetodoPago = 'efectivo',
    numeroTarjeta?: string,
  ): Promise<{ message: string; codigoPedido: string }> {
    const [datos, mediosHabilitados, precio] = await Promise.all([
      this.solicitudes.obtenerDatosGeocodificacionFarmacia(
        pacienteId,
        solicitudId,
      ),
      this.solicitudes.obtenerMediosPagoHabilitados(pacienteId),
      this.solicitudes.obtenerDatosPrecioPedido(pacienteId, solicitudId),
    ]);

    if (
      (metodoPago === 'efectivo' &&
        !mediosHabilitados.pagoEfectivoHabilitado) ||
      (metodoPago === 'tarjeta' && !mediosHabilitados.pagoTarjetaHabilitado) ||
      (metodoPago === 'transferencia' &&
        !mediosHabilitados.pagoTransferenciaHabilitado)
    ) {
      throw new MedioPagoNoHabilitadoError();
    }

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

    // Foto del precio al momento de enviar — la billetera del
    // Domiciliario se liquida con estos valores al entregar (ver
    // `app.entregar_pedido`), no con lo que diga la tarifa en ese
    // momento. La distancia se calcula acá en vivo (no viene de
    // `obtenerDatosPrecioPedido`, que solo refleja la ubicación ya
    // persistida — antes de enviar todavía no existe).
    const distanciaMetros =
      farmacia.lat != null &&
      farmacia.lng != null &&
      entrega.lat != null &&
      entrega.lng != null
        ? distanciaMetrosEntre(
            { lat: farmacia.lat, lng: farmacia.lng },
            { lat: entrega.lat, lng: entrega.lng },
          )
        : null;

    const precioCalculado = precio
      ? calcularPrecioDesdeParametros({ ...precio, distanciaMetros })
      : null;

    const copagoCobrado =
      precioCalculado?.disponible === true ? precioCalculado.copago : null;
    const domicilioCobrado =
      precioCalculado?.disponible === true ? precioCalculado.domicilio : null;
    const comisionAppPorcentaje = precio?.comisionAppPorcentaje ?? null;

    // Tarjeta se resuelve ACÁ, antes de tocar la base — si se rechaza,
    // la solicitud ni siquiera llega a `app.enviar_solicitud` (sigue en
    // `borrador`, el Paciente reintenta sin perder nada).
    if (metodoPago === 'tarjeta') {
      if (!numeroTarjeta) {
        throw new PagoTarjetaRechazadoError();
      }
      const monto =
        copagoCobrado != null && domicilioCobrado != null
          ? copagoCobrado + domicilioCobrado
          : 0;
      const resultadoPago = await this.pagoTarjeta.procesar(
        numeroTarjeta,
        monto,
      );
      if (resultadoPago === 'rechazado') {
        throw new PagoTarjetaRechazadoError();
      }
    }

    // Transferencia se resuelve ACÁ, igual que tarjeta — pasarela
    // simulada que aprueba el pago en TS, sin subir ningún comprobante.
    // Si se rechaza, la solicitud ni siquiera llega a
    // `app.enviar_solicitud` (sigue en `borrador`).
    if (metodoPago === 'transferencia') {
      const monto =
        copagoCobrado != null && domicilioCobrado != null
          ? copagoCobrado + domicilioCobrado
          : 0;
      const resultadoPago = await this.pagoTransferencia.procesar(monto);
      if (resultadoPago === 'rechazado') {
        throw new PagoTransferenciaRechazadoError();
      }
    }

    const resultado = await this.solicitudes.enviar(
      pacienteId,
      solicitudId,
      farmacia.lat,
      farmacia.lng,
      entrega.lat,
      entrega.lng,
      metodoPago,
      copagoCobrado,
      domicilioCobrado,
      comisionAppPorcentaje,
      null,
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
