import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';

export const MENSAJE_FOTO_CEDULA_ACTUALIZADA =
  'Tu foto de cédula fue actualizada.';
export const BUCKET_PERFILES = 'perfiles';

export type SubirFotoCedulaPacienteCommand = {
  usuarioId: string;
  contenido: Buffer;
  contentType: string;
  extension: string;
};

export type SubirFotoCedulaPacienteResultado = {
  message: string;
};

/**
 * G01/G03 — sube la foto de cédula del Paciente a Storage y persiste el
 * path. Dos pasos porque el path solo se guarda en BD si el rol es
 * válido y la subida a Storage tuvo éxito primero.
 */
@Injectable()
export class SubirFotoCedulaPacienteUseCase {
  constructor(
    private readonly perfiles: PerfilRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    command: SubirFotoCedulaPacienteCommand,
  ): Promise<SubirFotoCedulaPacienteResultado> {
    const path = `paciente/${command.usuarioId}/cedula.${command.extension}`;

    await this.almacenamiento.subir(
      BUCKET_PERFILES,
      path,
      command.contenido,
      command.contentType,
    );

    const actualizado = await this.perfiles.actualizarFotoCedulaPaciente(
      command.usuarioId,
      path,
    );
    if (!actualizado) {
      throw new RolNoAutorizadoError();
    }

    return { message: MENSAJE_FOTO_CEDULA_ACTUALIZADA };
  }
}
