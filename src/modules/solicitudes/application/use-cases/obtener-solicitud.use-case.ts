import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  EventoHistorial,
  SolicitudDetalle,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

export type ObtenerSolicitudResultado = SolicitudDetalle & {
  historial: EventoHistorial[];
};

/** G03 — detalle + historial de estados. */
@Injectable()
export class ObtenerSolicitudUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    pacienteId: string,
    solicitudId: string,
  ): Promise<ObtenerSolicitudResultado> {
    const [detalle, historial] = await Promise.all([
      this.solicitudes.obtener(pacienteId, solicitudId),
      this.solicitudes.listarHistorial(pacienteId, solicitudId),
    ]);

    if (!detalle) {
      throw new SolicitudNoEncontradaError();
    }

    return { ...detalle, historial };
  }
}
