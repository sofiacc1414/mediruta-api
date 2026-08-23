import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import {
  PerfilRepositoryPort,
  TipoDocumentoDomiciliario,
} from '../../domain/ports/perfil.repository.port';
import { BUCKET_PERFILES } from './subir-foto-cedula-paciente.use-case';

export const MENSAJE_DOCUMENTO_ACTUALIZADO = 'Tu documento fue actualizado.';

export type SubirDocumentoDomiciliarioCommand = {
  usuarioId: string;
  tipo: TipoDocumentoDomiciliario;
  contenido: Buffer;
  contentType: string;
  extension: string;
};

export type SubirDocumentoDomiciliarioResultado = {
  message: string;
};

/** G01/G03 — sube un documento del Domiciliario (cédula/licencia/SOAT/
 * tecnicomecánica) a Storage y persiste el path. */
@Injectable()
export class SubirDocumentoDomiciliarioUseCase {
  constructor(
    private readonly perfiles: PerfilRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    command: SubirDocumentoDomiciliarioCommand,
  ): Promise<SubirDocumentoDomiciliarioResultado> {
    const path = `domiciliario/${command.usuarioId}/${command.tipo}.${command.extension}`;

    await this.almacenamiento.subir(
      BUCKET_PERFILES,
      path,
      command.contenido,
      command.contentType,
    );

    const actualizado = await this.perfiles.actualizarDocumentoDomiciliario(
      command.usuarioId,
      command.tipo,
      path,
    );
    if (!actualizado) {
      throw new RolNoAutorizadoError();
    }

    return { message: MENSAJE_DOCUMENTO_ACTUALIZADO };
  }
}
