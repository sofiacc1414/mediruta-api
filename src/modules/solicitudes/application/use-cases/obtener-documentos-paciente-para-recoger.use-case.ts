import { Injectable, Logger } from '@nestjs/common';
import { BUCKET_PERFILES } from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { FueraDeUbicacionAutorizadaError } from '../../domain/errors/fuera-de-ubicacion-autorizada.error';
import { DocumentosPacienteNoDisponiblesError } from '../../domain/errors/documentos-paciente-no-disponibles.error';
import {
  ACCESO_TEMPORAL_SEGUNDOS,
  dentroDeGeocerca,
} from '../../domain/geocerca-acceso';
import { AccesoTemporalRepositoryPort } from '../../domain/ports/acceso-temporal.repository.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export type ObtenerDocumentosPacienteParaRecogerResultado = {
  cedulaFrenteUrl: string | null;
  cedulaReversoUrl: string | null;
  /** Ronda 10 — antes faltaba: el Domiciliario necesita ver la fórmula
   * médica del pedido acá mismo, no solo la cédula, para retirar el
   * medicamento correcto. */
  recetaUrl: string | null;
};

/**
 * HU-07/HU-09 — la cédula del Paciente (ambos lados) y la fórmula
 * médica del pedido, para que el Domiciliario las muestre en la
 * farmacia al retirar el medicamento a su nombre. Por seguridad/
 * privacidad, el repositorio solo devuelve algo mientras el pedido
 * está en `asignado_en_camino_farmacia` y dentro de la geocerca de
 * la farmacia. Antes o después, o lejos del punto, no hay documentos.
 */
@Injectable()
export class ObtenerDocumentosPacienteParaRecogerUseCase {
  private readonly logger = new Logger(
    ObtenerDocumentosPacienteParaRecogerUseCase.name,
  );

  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
    private readonly accesos: AccesoTemporalRepositoryPort,
  ) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
    lat?: number | null,
    lng?: number | null,
  ): Promise<ObtenerDocumentosPacienteParaRecogerResultado> {
    const punto = await this.accesos.puntoFarmacia(domiciliarioId, solicitudId);
    if (!punto || punto.estado !== 'en_farmacia') {
      if (punto) await this.accesos.revocarPorPedido(solicitudId);
      await this.accesos.registrar({
        solicitudId,
        domiciliarioId,
        resultado: 'rechazado',
        lat: lat ?? null,
        lng: lng ?? null,
        expiraEn: null,
      });
      throw new DocumentosPacienteNoDisponiblesError();
    }

    if (!dentroDeGeocerca(lat, lng, punto.farmaciaLat, punto.farmaciaLng)) {
      await this.accesos.revocarPorPedido(solicitudId);
      await this.accesos.registrar({
        solicitudId,
        domiciliarioId,
        resultado: 'rechazado',
        lat: lat ?? null,
        lng: lng ?? null,
        expiraEn: null,
      });
      throw new FueraDeUbicacionAutorizadaError();
    }

    const documentos =
      await this.solicitudes.obtenerDocumentosPacienteParaRecoger(
        domiciliarioId,
        solicitudId,
      );

    if (!documentos) {
      await this.accesos.registrar({
        solicitudId,
        domiciliarioId,
        resultado: 'rechazado',
        lat: lat ?? null,
        lng: lng ?? null,
        expiraEn: null,
      });
      throw new DocumentosPacienteNoDisponiblesError();
    }

    const expiraEn = new Date(Date.now() + ACCESO_TEMPORAL_SEGUNDOS * 1000);
    await this.accesos.registrar({
      solicitudId,
      domiciliarioId,
      resultado: 'permitido',
      lat: lat ?? null,
      lng: lng ?? null,
      expiraEn,
    });

    const [cedulaFrenteUrl, cedulaReversoUrl] = await Promise.all([
      this.urlFirmadaOpcional(documentos.cedulaFrentePath),
      this.urlFirmadaOpcional(documentos.cedulaReversoPath),
    ]);

    return { cedulaFrenteUrl, cedulaReversoUrl, recetaUrl: null };
  }

  private async urlFirmadaOpcional(
    path: string | null,
  ): Promise<string | null> {
    if (!path) {
      return null;
    }
    try {
      return await this.almacenamiento.obtenerUrlFirmada(
        BUCKET_PERFILES,
        path,
        ACCESO_TEMPORAL_SEGUNDOS,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la URL firmada para "${path}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
