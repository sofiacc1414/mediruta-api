import { Injectable } from '@nestjs/common';
import { GeocodificacionPort } from '../../../solicitudes/domain/ports/geocodificacion.port';
import { DireccionNoValidaError } from '../../domain/errors/direccion-no-valida.error';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_PERFIL_PACIENTE_ACTUALIZADO =
  'Tu perfil de Paciente fue actualizado correctamente.';

export type ActualizarPerfilPacienteCommand = {
  usuarioId: string;
  direccion: string;
  fechaNacimiento: string;
  /** HU-09 — contexto de geocodificación, obligatorio igual que el
   * resto de los campos acá. */
  departamento: string;
  ciudad: string;
};

export type ActualizarPerfilPacienteResultado = {
  message: string;
};

/** G01/G03 — dirección + fecha de nacimiento del Paciente.
 *
 * Ronda 10 — bug real reportado: se dejaba guardar cualquier texto
 * como dirección sin validar nada. Ahora se geocodifica antes de
 * guardar (mismo `GeocodificacionPort` que usan los pedidos) — si
 * Nominatim no encuentra NADA se rechaza el guardado
 * (`DireccionNoValidaError`); si encuentra un lugar impreciso (ej. un
 * barrio, sin punto exacto) se deja guardar igual — no tiene sentido
 * ser más estricto acá que al enviar un pedido de verdad. */
@Injectable()
export class ActualizarPerfilPacienteUseCase {
  constructor(
    private readonly perfiles: PerfilRepositoryPort,
    private readonly geocodificacion: GeocodificacionPort,
  ) {}

  async execute(
    command: ActualizarPerfilPacienteCommand,
  ): Promise<ActualizarPerfilPacienteResultado> {
    const coordenadas = await this.geocodificacion.geocodificar(
      command.direccion,
      command.ciudad,
      command.departamento,
    );
    if (!coordenadas) {
      throw new DireccionNoValidaError();
    }

    const actualizado = await this.perfiles.upsertPerfilPaciente(
      command.usuarioId,
      command.direccion,
      command.fechaNacimiento,
      command.departamento,
      command.ciudad,
    );
    if (!actualizado) {
      throw new RolNoAutorizadoError();
    }
    return { message: MENSAJE_PERFIL_PACIENTE_ACTUALIZADO };
  }
}
