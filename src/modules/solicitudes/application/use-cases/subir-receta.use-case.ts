import { Injectable } from '@nestjs/common';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export type SubirRecetaCommand = {
  pacienteId: string;
  solicitudId: string;
  contenido: Buffer;
  contentType: string;
  extension: string;
};

export type SubirRecetaResultado = { message: string; url: string };

export const MENSAJE_RECETA_ACTUALIZADA =
  'La foto de tu receta fue actualizada.';

/** Sube/reemplaza la foto de la receta a Storage (bucket `perfiles`,
 * mismo patrón que los documentos de HU-02) y persiste el path. Solo
 * mientras la solicitud sigue en Borrador y es del dueño. */
@Injectable()
export class SubirRecetaUseCase {
  constructor(
    private readonly solicitudes: SolicitudRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(command: SubirRecetaCommand): Promise<SubirRecetaResultado> {
    const path = `solicitud/${command.solicitudId}/receta.${command.extension}`;

    await this.almacenamiento.subir(
      BUCKET_PERFILES,
      path,
      command.contenido,
      command.contentType,
    );

    const actualizada = await this.solicitudes.actualizarReceta(
      command.pacienteId,
      command.solicitudId,
      path,
    );
    if (!actualizada) {
      throw new SolicitudNoEncontradaError();
    }

    const url = await this.almacenamiento.obtenerUrlFirmada(
      BUCKET_PERFILES,
      path,
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );

    return { message: MENSAJE_RECETA_ACTUALIZADA, url };
  }
}
