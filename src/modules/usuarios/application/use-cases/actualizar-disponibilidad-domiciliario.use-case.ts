import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_DISPONIBILIDAD_ACTUALIZADA =
  'Tu disponibilidad fue actualizada.';

export type ActualizarDisponibilidadDomiciliarioCommand = {
  usuarioId: string;
  disponible: boolean;
  lat: number | null;
  lng: number | null;
};

/** HU-09 — el Domiciliario prende/apaga "Disponible para recibir
 * pedidos". La ubicación (la manda el celular) es obligatoria al
 * activar, no al desactivar. */
@Injectable()
export class ActualizarDisponibilidadDomiciliarioUseCase {
  constructor(private readonly perfiles: PerfilRepositoryPort) {}

  async execute(
    command: ActualizarDisponibilidadDomiciliarioCommand,
  ): Promise<{ message: string }> {
    const resultado = await this.perfiles.actualizarDisponibilidadDomiciliario(
      command.usuarioId,
      command.disponible,
      command.lat,
      command.lng,
    );

    switch (resultado) {
      case 'actualizado':
        return { message: MENSAJE_DISPONIBILIDAD_ACTUALIZADA };
      case 'no_autorizado':
      case 'no_encontrado':
        throw new RolNoAutorizadoError();
    }
  }
}
