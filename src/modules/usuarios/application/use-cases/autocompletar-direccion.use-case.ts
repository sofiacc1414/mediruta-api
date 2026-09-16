import { Injectable } from '@nestjs/common';
import {
  CandidatoDireccion,
  GeocodificacionPort,
} from '../../../solicitudes/domain/ports/geocodificacion.port';

export type AutocompletarDireccionCommand = {
  texto: string;
  ciudad: string | null;
  departamento: string | null;
};

/** Ronda 13 — bug real reportado: había que terminar de escribir y
 * salir del campo para enterarse de si una dirección existía. Se
 * llama mientras el Paciente todavía está escribiendo (con debounce
 * del lado de la App), para sugerir direcciones reales — ej.
 * "universidad de medellin" ofrece la lista de coincidencias antes de
 * que termine de escribir, no solo al final. */
@Injectable()
export class AutocompletarDireccionUseCase {
  constructor(private readonly geocodificacion: GeocodificacionPort) {}

  execute(command: AutocompletarDireccionCommand): Promise<CandidatoDireccion[]> {
    return this.geocodificacion.autocompletar(
      command.texto,
      command.ciudad,
      command.departamento,
    );
  }
}
