import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from './subir-foto-cedula-paciente.use-case';

export type ObtenerPerfilResultado = {
  nombreCompleto: string | null;
  telefono: string | null;
  fotoPerfilUrl: string | null;
  paciente: {
    direccion: string | null;
    fechaNacimiento: string | null;
    fotoCedulaUrl: string | null;
  } | null;
  domiciliario: {
    direccion: string | null;
    vehiculoTipo: string | null;
    vehiculoPlaca: string | null;
    cedulaUrl: string | null;
    licenciaUrl: string | null;
    soatUrl: string | null;
    tecnicomecanicaUrl: string | null;
  } | null;
};

/**
 * G02 — consulta el perfil propio. El repositorio devuelve los paths
 * guardados en BD; este caso de uso los resuelve a URLs firmadas de
 * corta duración (nunca se expone el path interno ni una URL pública —
 * DOCS/context.md, Parte B, sección 3, Storage).
 */
@Injectable()
export class ObtenerPerfilUseCase {
  constructor(
    private readonly perfiles: PerfilRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(usuarioId: string): Promise<ObtenerPerfilResultado> {
    const perfil = await this.perfiles.obtenerPerfil(usuarioId);
    if (!perfil) {
      throw new NoAutorizadoError();
    }

    const [
      fotoPerfilUrl,
      fotoCedulaUrl,
      cedulaUrl,
      licenciaUrl,
      soatUrl,
      tecnicomecanicaUrl,
    ] = await Promise.all([
      this.urlFirmadaOpcional(perfil.fotoPerfilPath),
      this.urlFirmadaOpcional(perfil.paciente?.fotoCedulaPath ?? null),
      this.urlFirmadaOpcional(perfil.domiciliario?.cedulaPath ?? null),
      this.urlFirmadaOpcional(perfil.domiciliario?.licenciaPath ?? null),
      this.urlFirmadaOpcional(perfil.domiciliario?.soatPath ?? null),
      this.urlFirmadaOpcional(perfil.domiciliario?.tecnicomecanicaPath ?? null),
    ]);

    return {
      nombreCompleto: perfil.nombreCompleto,
      telefono: perfil.telefono,
      fotoPerfilUrl,
      paciente: perfil.paciente
        ? {
            direccion: perfil.paciente.direccion,
            fechaNacimiento: perfil.paciente.fechaNacimiento,
            fotoCedulaUrl,
          }
        : null,
      domiciliario: perfil.domiciliario
        ? {
            direccion: perfil.domiciliario.direccion,
            vehiculoTipo: perfil.domiciliario.vehiculoTipo,
            vehiculoPlaca: perfil.domiciliario.vehiculoPlaca,
            cedulaUrl,
            licenciaUrl,
            soatUrl,
            tecnicomecanicaUrl,
          }
        : null,
    };
  }

  private async urlFirmadaOpcional(
    path: string | null,
  ): Promise<string | null> {
    if (!path) {
      return null;
    }
    return this.almacenamiento.obtenerUrlFirmada(
      BUCKET_PERFILES,
      path,
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  }
}
