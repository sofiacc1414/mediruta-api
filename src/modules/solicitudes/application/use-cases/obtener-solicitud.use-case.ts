import { Injectable } from '@nestjs/common';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  EstadoSolicitud,
  EventoHistorial,
  Medicamento,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type ObtenerSolicitudResultado = {
  id: string;
  estado: EstadoSolicitud;
  recetaUrl: string | null;
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
  creadoEn: string;
  enviadoEn: string | null;
  canceladoEn: string | null;
  /** URL firmada de `perfil_paciente.foto_cedula_path` (HU-02) —
   * referencia viva, nunca se copia a la solicitud. */
  cedulaUrl: string | null;
  medicamentos: Medicamento[];
  historial: EventoHistorial[];
};

/**
 * G03 — detalle + medicamentos + historial. Resuelve receta y cédula a
 * URLs firmadas, mismo patrón que ObtenerDetalleDomiciliarioUseCase de
 * HU-08 — la API nunca expone paths internos de Storage.
 */
@Injectable()
export class ObtenerSolicitudUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
  ): Promise<ObtenerSolicitudResultado> {
    const [detalle, medicamentos, historial] = await Promise.all([
      this.solicitudes.obtener(pacienteId, solicitudId),
      this.solicitudes.listarMedicamentos(pacienteId, solicitudId),
      this.solicitudes.listarHistorial(pacienteId, solicitudId),
    ]);

    if (!detalle) {
      throw new SolicitudNoEncontradaError();
    }

    const [recetaUrl, cedulaUrl] = await Promise.all([
      this.urlFirmadaOpcional(detalle.recetaPath),
      this.urlFirmadaOpcional(detalle.cedulaPath),
    ]);

    return {
      id: detalle.id,
      estado: detalle.estado,
      recetaUrl,
      recetaFechaVencimiento: detalle.recetaFechaVencimiento,
      direccionEntrega: detalle.direccionEntrega,
      creadoEn: detalle.creadoEn,
      enviadoEn: detalle.enviadoEn,
      canceladoEn: detalle.canceladoEn,
      cedulaUrl,
      medicamentos,
      historial,
    };
  }

  private async urlFirmadaOpcional(
    path: string | null,
  ): Promise<string | null> {
    if (!path) {
      return null;
    }
    return this.almacenamiento.obtenerUrlFirmada(
      BUCKET_PERFILES,
      path,
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  }
}
