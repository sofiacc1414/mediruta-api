import { Injectable, Logger } from '@nestjs/common';
import { AdministradorNoEncontradoError } from '../../domain/errors/administrador-no-encontrado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from './subir-foto-cedula-paciente.use-case';

export type AdministradorDetalleResultado = {
  id: string;
  correo: string;
  nombreCompleto: string | null;
  telefono: string | null;
  estadoCuenta: 'activa' | 'bloqueada' | 'desactivada';
  fotoPerfilUrl: string | null;
  creadoEn: string;
};

/** Panel admin — "ver el detalle de la ficha del usuario" (cuenta
 * ADMINISTRADOR). */
@Injectable()
export class ObtenerAdministradorUseCase {
  private readonly logger = new Logger(ObtenerAdministradorUseCase.name);

  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    adminId: string,
    usuarioId: string,
  ): Promise<AdministradorDetalleResultado> {
    const detalle = await this.usuarios.obtenerAdministrador(
      adminId,
      usuarioId,
    );
    if (!detalle) {
      throw new AdministradorNoEncontradoError();
    }

    let fotoPerfilUrl: string | null = null;
    if (detalle.fotoPerfilPath) {
      try {
        fotoPerfilUrl = await this.almacenamiento.obtenerUrlFirmada(
          BUCKET_PERFILES,
          detalle.fotoPerfilPath,
          URL_FIRMADA_EXPIRA_SEGUNDOS,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo generar la URL firmada para "${detalle.fotoPerfilPath}": ${(error as Error).message}`,
        );
      }
    }

    return {
      id: detalle.id,
      correo: detalle.correo,
      nombreCompleto: detalle.nombreCompleto,
      telefono: detalle.telefono,
      estadoCuenta: detalle.estadoCuenta,
      fotoPerfilUrl,
      creadoEn: detalle.creadoEn,
    };
  }
}
