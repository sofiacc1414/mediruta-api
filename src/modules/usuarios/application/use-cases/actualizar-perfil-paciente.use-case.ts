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
  /** Ver `ActualizarPerfilPacienteDto.direccionVerificada`. */
  direccionVerificada: boolean;
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
 * ser más estricto acá que al enviar un pedido de verdad.
 *
 * Ronda 14 — bug real reportado: guardar volvía a fallar con "no
 * pudimos ubicar esa dirección" para una dirección que la propia App
 * ya había confirmado segundos antes (al elegir una sugerencia, o por
 * el chequeo en vivo al salir del campo). Causa: geocodificar acá es
 * un SEGUNDO request a Nominatim, independiente del que ya hizo la
 * App — y Nominatim puede responder distinto entre uno y otro por una
 * inconsistencia de caché regional (verificado en vivo). El resultado
 * de esa geocodificación nunca se guarda (el perfil solo persiste el
 * texto, ver `upsertPerfilPaciente`) — es puramente una validación de
 * "¿esto existe?", así que si la App ya lo confirmó para este mismo
 * texto en esta misma sesión (`direccionVerificada`), repetirla acá
 * no suma seguridad, solo un punto más de falla. */
@Injectable()
export class ActualizarPerfilPacienteUseCase {
  constructor(
    private readonly perfiles: PerfilRepositoryPort,
    private readonly geocodificacion: GeocodificacionPort,
  ) {}

  async execute(
    command: ActualizarPerfilPacienteCommand,
  ): Promise<ActualizarPerfilPacienteResultado> {
    if (!command.direccionVerificada) {
      const coordenadas = await this.geocodificacion.geocodificar(
        command.direccion,
        command.ciudad,
        command.departamento,
      );
      if (!coordenadas) {
        throw new DireccionNoValidaError();
      }
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
