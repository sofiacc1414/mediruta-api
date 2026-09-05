import { Injectable } from '@nestjs/common';
import {
  NovedadDelPacienteConEstado,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** HU-07 (ronda 5) — "mis reportes sobre este pedido", con su estado.
 * A diferencia de `ObtenerSolicitudUseCase`/`novedadAbierta` (solo la
 * última sin resolver), esto trae todas — resueltas incluidas — para
 * que el Paciente vea el resultado de sus novedades ya atendidas. */
@Injectable()
export class ListarNovedadesSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(
    pacienteId: string,
    solicitudId: string,
  ): Promise<NovedadDelPacienteConEstado[]> {
    return this.solicitudes.listarNovedadesSolicitud(pacienteId, solicitudId);
  }
}
