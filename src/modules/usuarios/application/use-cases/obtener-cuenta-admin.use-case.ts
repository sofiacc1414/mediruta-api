import { Injectable, Logger } from '@nestjs/common';
import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import {
  CodigoRol,
  EstadoCuenta,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from './subir-foto-cedula-paciente.use-case';

export type CuentaAdminDetalleResultado = {
  id: string;
  correo: string;
  nombreCompleto: string | null;
  telefono: string | null;
  estadoCuenta: EstadoCuenta;
  fotoPerfilUrl: string | null;
  creadoEn: string;
  roles: CodigoRol[];
  paciente: {
    direccion: string | null;
    cedulaFrenteUrl: string | null;
    cedulaReversoUrl: string | null;
  } | null;
  domiciliario: {
    direccion: string | null;
    vehiculoTipo: string | null;
    vehiculoPlaca: string | null;
    cedulaFrenteUrl: string | null;
    cedulaReversoUrl: string | null;
    licenciaUrl: string | null;
    soatUrl: string | null;
    tecnicomecanicaUrl: string | null;
    disponible: boolean | null;
  } | null;
};

/** Panel admin — "ver detalle de la ficha del usuario" ampliado a
 * cualquier rol (Paciente/Domiciliario/Administrador): datos comunes +
 * documentos específicos del rol que tenga, con URLs firmadas. */
@Injectable()
export class ObtenerCuentaAdminUseCase {
  private readonly logger = new Logger(ObtenerCuentaAdminUseCase.name);

  constructor(
    private readonly usuarios: UsuarioRepositoryPort,
    private readonly almacenamiento: AlmacenamientoArchivosPort,
  ) {}

  async execute(
    adminId: string,
    usuarioId: string,
  ): Promise<CuentaAdminDetalleResultado> {
    const detalle = await this.usuarios.obtenerCuentaAdmin(adminId, usuarioId);
    if (!detalle) {
      throw new CuentaNoEncontradaError();
    }

    const esPaciente = detalle.roles.includes('PACIENTE');
    const esDomiciliario = detalle.roles.includes('DOMICILIARIO');

    const [
      fotoPerfilUrl,
      pacCedulaFrenteUrl,
      pacCedulaReversoUrl,
      domCedulaFrenteUrl,
      domCedulaReversoUrl,
      domLicenciaUrl,
      domSoatUrl,
      domTecnicomecanicaUrl,
    ] = await Promise.all([
      this.urlFirmadaOpcional(detalle.fotoPerfilPath),
      this.urlFirmadaOpcional(detalle.pacFotoCedulaFrentePath),
      this.urlFirmadaOpcional(detalle.pacFotoCedulaReversoPath),
      this.urlFirmadaOpcional(detalle.domCedulaFrentePath),
      this.urlFirmadaOpcional(detalle.domCedulaReversoPath),
      this.urlFirmadaOpcional(detalle.domLicenciaPath),
      this.urlFirmadaOpcional(detalle.domSoatPath),
      this.urlFirmadaOpcional(detalle.domTecnicomecanicaPath),
    ]);

    return {
      id: detalle.id,
      correo: detalle.correo,
      nombreCompleto: detalle.nombreCompleto,
      telefono: detalle.telefono,
      estadoCuenta: detalle.estadoCuenta,
      fotoPerfilUrl,
      creadoEn: detalle.creadoEn,
      roles: detalle.roles,
      paciente: esPaciente
        ? {
            direccion: detalle.pacDireccion,
            cedulaFrenteUrl: pacCedulaFrenteUrl,
            cedulaReversoUrl: pacCedulaReversoUrl,
          }
        : null,
      domiciliario: esDomiciliario
        ? {
            direccion: detalle.domDireccion,
            vehiculoTipo: detalle.domVehiculoTipo,
            vehiculoPlaca: detalle.domVehiculoPlaca,
            cedulaFrenteUrl: domCedulaFrenteUrl,
            cedulaReversoUrl: domCedulaReversoUrl,
            licenciaUrl: domLicenciaUrl,
            soatUrl: domSoatUrl,
            tecnicomecanicaUrl: domTecnicomecanicaUrl,
            disponible: detalle.domDisponible,
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
    try {
      return await this.almacenamiento.obtenerUrlFirmada(
        BUCKET_PERFILES,
        path,
        URL_FIRMADA_EXPIRA_SEGUNDOS,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la URL firmada para "${path}": ${(error as Error).message}`,
      );
      return null;
    }
  }
}
