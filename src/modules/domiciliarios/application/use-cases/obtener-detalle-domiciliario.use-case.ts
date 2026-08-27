import { Injectable, Logger } from '@nestjs/common';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { DomiciliarioNoEncontradoError } from '../../domain/errors/domiciliario-no-encontrado.error';
import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';

export type DetalleDomiciliarioResultado = {
  nombreCompleto: string | null;
  telefono: string | null;
  estado: 'pendiente_validacion' | 'habilitado' | 'rechazado';
  solicitadoEn: string;
  direccion: string | null;
  vehiculoTipo: string | null;
  vehiculoPlaca: string | null;
  cedulaFrenteUrl: string | null;
  cedulaReversoUrl: string | null;
  licenciaUrl: string | null;
  soatUrl: string | null;
  tecnicomecanicaUrl: string | null;
  historial: {
    decision: 'aprobado' | 'rechazado';
    motivo: string | null;
    creadoEn: string;
    adminCorreo: string;
  }[];
};

/**
 * G02/G06 — detalle de un domiciliario pendiente (o ya decidido) más su
 * historial de validaciones. Resuelve los paths de perfil_domiciliario
 * (HU-02) a URLs firmadas, mismo patrón que ObtenerPerfilUseCase — la
 * API nunca expone paths internos de Storage.
 */
@Injectable()
export class ObtenerDetalleDomiciliarioUseCase {
  private readonly logger = new Logger(ObtenerDetalleDomiciliarioUseCase.name);

  constructor(
    private readonly validaciones: ValidacionDomiciliarioRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    adminId: string,
    domiciliarioId: string,
  ): Promise<DetalleDomiciliarioResultado> {
    const [detalle, historial] = await Promise.all([
      this.validaciones.obtenerDetalle(adminId, domiciliarioId),
      this.validaciones.listarHistorial(adminId, domiciliarioId),
    ]);

    if (!detalle) {
      throw new DomiciliarioNoEncontradoError();
    }

    const [cedulaFrenteUrl, cedulaReversoUrl, licenciaUrl, soatUrl, tecnicomecanicaUrl] =
      await Promise.all([
        this.urlFirmadaOpcional(detalle.cedulaFrentePath),
        this.urlFirmadaOpcional(detalle.cedulaReversoPath),
        this.urlFirmadaOpcional(detalle.licenciaPath),
        this.urlFirmadaOpcional(detalle.soatPath),
        this.urlFirmadaOpcional(detalle.tecnicomecanicaPath),
      ]);

    return {
      nombreCompleto: detalle.nombreCompleto,
      telefono: detalle.telefono,
      estado: detalle.estado,
      solicitadoEn: detalle.solicitadoEn,
      direccion: detalle.direccion,
      vehiculoTipo: detalle.vehiculoTipo,
      vehiculoPlaca: detalle.vehiculoPlaca,
      cedulaFrenteUrl,
      cedulaReversoUrl,
      licenciaUrl,
      soatUrl,
      tecnicomecanicaUrl,
      historial,
    };
  }

  /**
   * `null` tanto si no hay path como si Storage no pudo generar la URL
   * (archivo movido/borrado, etc.) — un adjunto que no se puede
   * previsualizar no debe tumbar el detalle entero con un 500.
   */
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
        URL_FIRMADA_EXPIRA_SEGUNDOS,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la URL firmada para "${path}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
