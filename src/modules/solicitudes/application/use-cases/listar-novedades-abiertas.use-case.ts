import { Injectable } from '@nestjs/common';
import {
  NovedadAbierta,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** HU-07 — panel de novedades del Administrador. Vacío (no error) si
 * la cuenta no es Administrador/Root — el `RolesGuard` de la API ya es
 * la autorización real (@Roles('ADMINISTRADOR', 'ROOT') en el
 * controller), esto es defensa en profundidad. */
@Injectable()
export class ListarNovedadesAbiertasUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(adminId: string): Promise<NovedadAbierta[]> {
    return this.solicitudes.listarNovedadesAbiertas(adminId);
  }
}
