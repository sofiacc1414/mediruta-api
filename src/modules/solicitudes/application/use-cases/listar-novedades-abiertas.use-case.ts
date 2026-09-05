import { Injectable } from '@nestjs/common';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import {
  EstadoNovedadAdmin,
  NovedadAbierta,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

const ESTADOS_VALIDOS: EstadoNovedadAdmin[] = [
  'abierta',
  'aprobada',
  'rechazada',
  'resuelta',
  'todas',
];

/** HU-07 — panel de novedades del Administrador. Vacío (no error) si
 * la cuenta no es Administrador/Root — el `RolesGuard` de la API ya es
 * la autorización real (@Roles('ADMINISTRADOR', 'ROOT') en el
 * controller), esto es defensa en profundidad.
 *
 * Ronda 4 — además firma las URLs de la receta vigente y de la
 * propuesta (si la hay) para las novedades tipo 'edicion', mismo
 * criterio que ya usa `ObtenerDetallePedidoAdminUseCase` para no
 * exponer paths crudos de Storage al cliente.
 *
 * Ronda 6 — acepta un filtro de `estado` (abierta/aprobada/rechazada/
 * resuelta/todas); por defecto sigue trayendo solo las abiertas, como
 * antes. Un valor inesperado (query param mal formado) cae a 'abierta'
 * en vez de fallar. */
@Injectable()
export class ListarNovedadesAbiertasUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    adminId: string,
    estado?: string,
  ): Promise<NovedadAbierta[]> {
    const estadoValido = ESTADOS_VALIDOS.includes(estado as EstadoNovedadAdmin)
      ? (estado as EstadoNovedadAdmin)
      : 'abierta';
    const novedades = await this.solicitudes.listarNovedadesAbiertas(
      adminId,
      estadoValido,
    );
    return Promise.all(
      novedades.map((novedad) => this.conUrlsFirmadas(novedad)),
    );
  }

  private async conUrlsFirmadas(
    novedad: NovedadAbierta,
  ): Promise<NovedadAbierta> {
    const { recetaPathActual, ...resto } = novedad;
    if (novedad.tipo !== 'edicion') {
      return resto;
    }

    const [recetaActualUrl, recetaPropuestaUrl] = await Promise.all([
      this.urlFirmadaOpcional(recetaPathActual),
      this.urlFirmadaOpcional(novedad.datosPropuestos?.recetaPath ?? null),
    ]);

    return { ...resto, recetaActualUrl, recetaPropuestaUrl };
  }

  private async urlFirmadaOpcional(
    path: string | null | undefined,
  ): Promise<string | null> {
    if (!path) return null;
    try {
      return await this.almacenamiento.obtenerUrlFirmada(
        BUCKET_PERFILES,
        path,
        URL_FIRMADA_EXPIRA_SEGUNDOS,
      );
    } catch {
      return null;
    }
  }
}
