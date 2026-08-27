import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import {
  LadoDocumento,
  PerfilRepositoryPort,
} from '../../domain/ports/perfil.repository.port';

export const MENSAJE_FOTO_CEDULA_ACTUALIZADA =
  'Tu foto de cédula fue actualizada.';
export const BUCKET_PERFILES = 'perfiles';
/** 1 hora — alcanza para que la pantalla de perfil muestre las miniaturas
 * sin tener que regenerar la URL en cada render. */
export const URL_FIRMADA_EXPIRA_SEGUNDOS = 3600;

export type SubirFotoCedulaPacienteCommand = {
  usuarioId: string;
  lado: LadoDocumento;
  contenido: Buffer;
  contentType: string;
  extension: string;
};

export type SubirFotoCedulaPacienteResultado = {
  message: string;
  url: string;
};

/**
 * G01/G03 — sube un lado (frente o reverso) de la cédula del Paciente a
 * Storage y persiste el path. Los dos lados se suben por separado, uno
 * a la vez — la cédula colombiana trae información necesaria en ambas
 * caras, así que `app.crear_solicitud` exige las dos antes de dejar
 * enviar una solicitud. Dos pasos porque el path solo se guarda en BD
 * si el rol es válido y la subida a Storage tuvo éxito primero. Devuelve
 * una URL firmada para que la App pueda mostrar la miniatura sin otro
 * round-trip.
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
    const path = `paciente/${command.usuarioId}/cedula_${command.lado}.${command.extension}`;

    await this.almacenamiento.subir(
      BUCKET_PERFILES,
      path,
      command.contenido,
      command.contentType,
    );

    const actualizado = await this.perfiles.actualizarFotoCedulaPaciente(
      command.usuarioId,
      command.lado,
      path,
    );
    if (!actualizado) {
      throw new RolNoAutorizadoError();
    }

    const url = await this.almacenamiento.obtenerUrlFirmada(
      BUCKET_PERFILES,
      path,
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );

    return { message: MENSAJE_FOTO_CEDULA_ACTUALIZADA, url };
  }
}
