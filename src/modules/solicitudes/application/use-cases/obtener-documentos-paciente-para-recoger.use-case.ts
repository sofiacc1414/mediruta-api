import { Injectable, Logger } from '@nestjs/common';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { DocumentosPacienteNoDisponiblesError } from '../../domain/errors/documentos-paciente-no-disponibles.error';
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
 * está en `asignado_en_camino_farmacia` — antes o después de esa
 * ventana, `null`, y acá se traduce a un error de dominio en vez de
 * "documentos vacíos" (para que la App distinga "todavía no llegó ese
 * momento" de "esta persona no tiene cédula cargada").
 */
@Injectable()
export class ObtenerDocumentosPacienteParaRecogerUseCase {
  private readonly logger = new Logger(
    ObtenerDocumentosPacienteParaRecogerUseCase.name,
  );

  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ObtenerDocumentosPacienteParaRecogerResultado> {
    const documentos =
      await this.solicitudes.obtenerDocumentosPacienteParaRecoger(
        domiciliarioId,
        solicitudId,
      );

    if (!documentos) {
      throw new DocumentosPacienteNoDisponiblesError();
    }

    const [cedulaFrenteUrl, cedulaReversoUrl, recetaUrl] = await Promise.all([
      this.urlFirmadaOpcional(documentos.cedulaFrentePath),
      this.urlFirmadaOpcional(documentos.cedulaReversoPath),
      this.urlFirmadaOpcional(documentos.recetaPath),
    ]);

    return { cedulaFrenteUrl, cedulaReversoUrl, recetaUrl };
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
