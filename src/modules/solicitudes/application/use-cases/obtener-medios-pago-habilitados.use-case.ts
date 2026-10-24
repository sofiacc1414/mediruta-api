import { Injectable } from '@nestjs/common';
import {
  MediosPagoHabilitados,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** Módulo 4 — qué medios de pago puede elegir el Paciente ahora mismo
 * (toggles del panel admin). Lectura pública para cualquier usuario
 * autenticado, no solo Paciente — pero se expone acá porque es el
 * checkout de la solicitud quien lo necesita. */
@Injectable()
export class ObtenerMediosPagoHabilitadosUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(usuarioId: string): Promise<MediosPagoHabilitados> {
    return this.solicitudes.obtenerMediosPagoHabilitados(usuarioId);
  }
}
