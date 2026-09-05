import { Injectable } from '@nestjs/common';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export type AdjuntarRecetaPropuestaEdicionCommand = {
  pacienteId: string;
  solicitudId: string;
  novedadId: string;
  contenido: Buffer;
  contentType: string;
  extension: string;
};

export type AdjuntarRecetaPropuestaEdicionResultado = {
  message: string;
  url: string;
};

export const MENSAJE_RECETA_PROPUESTA_ADJUNTADA =
  'La foto de la nueva receta fue adjuntada — el administrador la revisa junto al resto del cambio.';

/** HU-07 (ronda 4) — adjunta una foto de receta "propuesta" a una
 * novedad de edición ya creada (ver `SolicitarEdicionPedidoUseCase`).
 * Sube a un path aparte de la receta vigente (sufijo `_propuesta`,
 * mismo bucket privado `perfiles` que usa `SubirRecetaUseCase`) — no
 * toca `solicitudes.receta_path` acá; eso solo pasa si el admin
 * aprueba la novedad (`app.aprobar_edicion_pedido_admin`). */
@Injectable()
export class AdjuntarRecetaPropuestaEdicionUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    command: AdjuntarRecetaPropuestaEdicionCommand,
  ): Promise<AdjuntarRecetaPropuestaEdicionResultado> {
    const path = `solicitud/${command.solicitudId}/receta_propuesta.${command.extension}`;

    await this.almacenamiento.subir(
      BUCKET_PERFILES,
      path,
      command.contenido,
      command.contentType,
    );

    const actualizada = await this.solicitudes.adjuntarRecetaPropuestaEdicion(
      command.pacienteId,
      command.novedadId,
      path,
    );
    if (!actualizada) {
      throw new NovedadNoEncontradaError();
    }

    const url = await this.almacenamiento.obtenerUrlFirmada(
      BUCKET_PERFILES,
      path,
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );

    return { message: MENSAJE_RECETA_PROPUESTA_ADJUNTADA, url };
  }
}
