import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from './subir-foto-cedula-paciente.use-case';

export const MENSAJE_FOTO_PERFIL_ACTUALIZADA =
  'Tu foto de perfil fue actualizada.';

export type SubirFotoPerfilCommand = {
  usuarioId: string;
  contenido: Buffer;
  contentType: string;
  extension: string;
};

export type SubirFotoPerfilResultado = {
  message: string;
  url: string;
};

/**
 * Foto de perfil (avatar) — común a cualquier rol, sin restricción de
 * rol a diferencia de foto de cédula / documentos de Domiciliario. No
 * corresponde a un Gxx específico de HU-02 (se agregó a pedido
 * explícito, mismo patrón de Storage ya construido para esa historia).
 */
@Injectable()
export class SubirFotoPerfilUseCase {
  constructor(
    private readonly perfiles: PerfilRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    command: SubirFotoPerfilCommand,
  ): Promise<SubirFotoPerfilResultado> {
    const path = `perfil/${command.usuarioId}/foto.${command.extension}`;

    await this.almacenamiento.subir(
      BUCKET_PERFILES,
      path,
      command.contenido,
      command.contentType,
    );

    const actualizado = await this.perfiles.actualizarFotoPerfil(
      command.usuarioId,
      path,
    );
    if (!actualizado) {
      throw new NoAutorizadoError();
    }

    const url = await this.almacenamiento.obtenerUrlFirmada(
      BUCKET_PERFILES,
      path,
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );

    return { message: MENSAJE_FOTO_PERFIL_ACTUALIZADA, url };
  }
}
