import { Injectable, Logger } from '@nestjs/common';
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
  NovedadDelPaciente,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type DetallePedidoAdminResultado = {
  id: string;
  codigoPedido: string;
  estado: EstadoSolicitud;
  recetaUrl: string | null;
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
  enviadoEn: string | null;
  canceladoEn: string | null;
  codigoEntrega: string | null;
  paciente: {
    nombre: string | null;
    correo: string;
    telefono: string | null;
    cedulaFrenteUrl: string | null;
    cedulaReversoUrl: string | null;
  };
  domiciliario: {
    nombre: string | null;
    correo: string;
    telefono: string | null;
  } | null;
  medicamentos: Medicamento[];
  historial: EventoHistorial[];
  novedadAbierta: NovedadDelPaciente | null;
};

/**
 * Panel admin — "ver el detalle de cada pedido, no solo el listado":
 * datos + medicamentos + tracking (historial) + novedad abierta +
 * cédula del paciente (ambos lados), para que el admin tenga la misma
 * visibilidad que tuvo el Domiciliario al reclamar el medicamento.
 * Mismo criterio que `ObtenerSolicitudUseCase` del lado del Paciente,
 * sin restricción de dueño (solo exige rol admin, ya validado por
 * `RolesGuard` antes de llegar acá).
 */
@Injectable()
export class ObtenerDetallePedidoAdminUseCase {
  private readonly logger = new Logger(ObtenerDetallePedidoAdminUseCase.name);

  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    adminId: string,
    solicitudId: string,
  ): Promise<DetallePedidoAdminResultado> {
    const [detalle, medicamentos, historial, novedadAbierta] =
      await Promise.all([
        this.solicitudes.obtenerPedidoAdmin(adminId, solicitudId),
        this.solicitudes.listarMedicamentosPedidoAdmin(adminId, solicitudId),
        this.solicitudes.listarHistorialPedidoAdmin(adminId, solicitudId),
        this.solicitudes.obtenerNovedadAbiertaPedidoAdmin(adminId, solicitudId),
      ]);

    if (!detalle) {
      throw new SolicitudNoEncontradaError();
    }

    const [recetaUrl, cedulaFrenteUrl, cedulaReversoUrl] = await Promise.all([
      this.urlFirmadaOpcional(detalle.recetaPath),
      this.urlFirmadaOpcional(detalle.pacienteCedulaFrentePath),
      this.urlFirmadaOpcional(detalle.pacienteCedulaReversoPath),
    ]);

    return {
      id: detalle.id,
      codigoPedido: detalle.codigoPedido,
      estado: detalle.estado,
      recetaUrl,
      recetaFechaVencimiento: detalle.recetaFechaVencimiento,
      direccionEntrega: detalle.direccionEntrega,
      direccionFarmacia: detalle.direccionFarmacia,
      creadoEn: detalle.creadoEn,
      enviadoEn: detalle.enviadoEn,
      canceladoEn: detalle.canceladoEn,
      codigoEntrega: detalle.codigoEntrega,
      paciente: {
        nombre: detalle.pacienteNombre,
        correo: detalle.pacienteCorreo,
        telefono: detalle.pacienteTelefono,
        cedulaFrenteUrl,
        cedulaReversoUrl,
      },
      domiciliario: detalle.domiciliarioCorreo
        ? {
            nombre: detalle.domiciliarioNombre,
            correo: detalle.domiciliarioCorreo,
            telefono: detalle.domiciliarioTelefono,
          }
        : null,
      medicamentos,
      historial,
      novedadAbierta,
    };
  }

  /**
   * `null` tanto si no hay path como si Storage no pudo generar la URL
   * — un adjunto que no se puede previsualizar no debe tumbar el
   * detalle entero con un 500 (mismo criterio que
   * `ObtenerSolicitudUseCase`).
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
