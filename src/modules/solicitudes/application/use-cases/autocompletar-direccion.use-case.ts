import { Injectable } from '@nestjs/common';
import {
  CandidatoDireccion,
  GeocodificacionPort,
} from '../../domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export type AutocompletarDireccionCommand = {
  pacienteId: string;
  texto: string;
};

/** Ronda 13 — sugerencias mientras el Paciente todavía está
 * escribiendo la dirección de farmacia/entrega (ej. "universidad de
 * medellin"), no solo al perder el foco. Mismo criterio que
 * `EstimarPrecioPedidoUseCase`: la ciudad/departamento vienen del
 * perfil del Paciente, no de un parámetro suelto — así la búsqueda
 * queda acotada a su zona sin que la App tenga que conocer esos
 * datos por su cuenta. */
@Injectable()
export class AutocompletarDireccionUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly geocodificacion: GeocodificacionPort,
  ) {}

  async execute(command: AutocompletarDireccionCommand): Promise<CandidatoDireccion[]> {
    const parametros = await this.solicitudes.obtenerParametrosEstimacionPrecio(
      command.pacienteId,
    );
    return this.geocodificacion.autocompletar(
      command.texto,
      parametros?.ciudad ?? null,
      parametros?.departamento ?? null,
    );
  }
}
