import { Injectable } from '@nestjs/common';
import {
  NovedadDelPacienteConEstado,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** HU-07/HU-09 (ronda 7) — equivalente de `ListarNovedadesSolicitudUseCase`
 * para el tab "Novedades" del Domiciliario: todas las novedades del
 * pedido activo, resueltas o no. */
@Injectable()
export class ListarNovedadesSolicitudDomiciliarioUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<NovedadDelPacienteConEstado[]> {
    return this.solicitudes.listarNovedadesSolicitudDomiciliario(
      domiciliarioId,
      solicitudId,
    );
  }
}
