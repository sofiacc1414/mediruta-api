import { Injectable } from '@nestjs/common';
import {
  SolicitudRepositoryPort,
  SolicitudResumen,
} from '../../domain/ports/solicitud.repository.port';

/** G02 — "Mis solicitudes", más recientes primero. */
@Injectable()
export class ListarSolicitudesUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(pacienteId: string): Promise<SolicitudResumen[]> {
    return this.solicitudes.listar(pacienteId);
  }
}
