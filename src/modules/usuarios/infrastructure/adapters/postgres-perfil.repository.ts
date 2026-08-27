import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  LadoDocumento,
  Perfil,
  PerfilRepositoryPort,
  ResultadoActualizarDisponibilidad,
  TipoDocumentoDomiciliario,
} from '../../domain/ports/perfil.repository.port';

type FilaPerfil = {
  nombre_completo: string | null;
  telefono: string | null;
  foto_perfil_path: string | null;
  pac_direccion: string | null;
  pac_fecha_nacimiento: string | null;
  pac_foto_cedula_frente_path: string | null;
  pac_foto_cedula_reverso_path: string | null;
  pac_departamento: string | null;
  pac_ciudad: string | null;
  dom_direccion: string | null;
  dom_vehiculo_tipo: string | null;
  dom_vehiculo_placa: string | null;
  dom_cedula_frente_path: string | null;
  dom_cedula_reverso_path: string | null;
  dom_licencia_path: string | null;
  dom_soat_path: string | null;
  dom_tecnicomecanica_path: string | null;
};

@Injectable()
export class PostgresPerfilRepository extends PerfilRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async obtenerPerfil(usuarioId: string): Promise<Perfil | null> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaPerfil>(
        'select * from app.obtener_perfil($1)',
        [usuarioId],
      );

      if (!result.rowCount) {
        return null;
      }

      const fila = result.rows[0];
      const tienePaciente =
        fila.pac_direccion !== null ||
        fila.pac_fecha_nacimiento !== null ||
        fila.pac_foto_cedula_frente_path !== null ||
        fila.pac_foto_cedula_reverso_path !== null ||
        fila.pac_departamento !== null ||
        fila.pac_ciudad !== null;
      const tieneDomiciliario =
        fila.dom_direccion !== null ||
        fila.dom_vehiculo_tipo !== null ||
        fila.dom_vehiculo_placa !== null ||
        fila.dom_cedula_frente_path !== null ||
        fila.dom_cedula_reverso_path !== null ||
        fila.dom_licencia_path !== null ||
        fila.dom_soat_path !== null ||
        fila.dom_tecnicomecanica_path !== null;

      return {
        nombreCompleto: fila.nombre_completo,
        telefono: fila.telefono,
        fotoPerfilPath: fila.foto_perfil_path,
        paciente: tienePaciente
          ? {
              direccion: fila.pac_direccion,
              fechaNacimiento: fila.pac_fecha_nacimiento,
              fotoCedulaFrentePath: fila.pac_foto_cedula_frente_path,
              fotoCedulaReversoPath: fila.pac_foto_cedula_reverso_path,
              departamento: fila.pac_departamento,
              ciudad: fila.pac_ciudad,
            }
          : null,
        domiciliario: tieneDomiciliario
          ? {
              direccion: fila.dom_direccion,
              vehiculoTipo: fila.dom_vehiculo_tipo,
              vehiculoPlaca: fila.dom_vehiculo_placa,
              cedulaFrentePath: fila.dom_cedula_frente_path,
              cedulaReversoPath: fila.dom_cedula_reverso_path,
              licenciaPath: fila.dom_licencia_path,
              soatPath: fila.dom_soat_path,
              tecnicomecanicaPath: fila.dom_tecnicomecanica_path,
            }
          : null,
      };
    });
  }

  actualizarDatosComunes(
    usuarioId: string,
    nombreCompleto: string,
    telefono: string,
  ): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ actualizar_datos_comunes: boolean }>(
        'select app.actualizar_datos_comunes($1, $2, $3) as actualizar_datos_comunes',
        [usuarioId, nombreCompleto, telefono],
      );
      return result.rows[0].actualizar_datos_comunes;
    });
  }

  upsertPerfilPaciente(
    usuarioId: string,
    direccion: string,
    fechaNacimiento: string,
    departamento: string,
    ciudad: string,
  ): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ upsert_perfil_paciente: boolean }>(
        'select app.upsert_perfil_paciente($1, $2, $3, $4, $5) as upsert_perfil_paciente',
        [usuarioId, direccion, fechaNacimiento, departamento, ciudad],
      );
      return result.rows[0].upsert_perfil_paciente;
    });
  }

  actualizarFotoCedulaPaciente(
    usuarioId: string,
    lado: LadoDocumento,
    path: string,
  ): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        actualizar_foto_cedula_paciente: boolean;
      }>(
        'select app.actualizar_foto_cedula_paciente($1, $2, $3) as actualizar_foto_cedula_paciente',
        [usuarioId, lado, path],
      );
      return result.rows[0].actualizar_foto_cedula_paciente;
    });
  }

  actualizarFotoPerfil(usuarioId: string, path: string): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ actualizar_foto_perfil: boolean }>(
        'select app.actualizar_foto_perfil($1, $2) as actualizar_foto_perfil',
        [usuarioId, path],
      );
      return result.rows[0].actualizar_foto_perfil;
    });
  }

  upsertPerfilDomiciliario(
    usuarioId: string,
    direccion: string,
    vehiculoTipo: string,
    vehiculoPlaca: string,
  ): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        upsert_perfil_domiciliario: boolean;
      }>(
        'select app.upsert_perfil_domiciliario($1, $2, $3, $4) as upsert_perfil_domiciliario',
        [usuarioId, direccion, vehiculoTipo, vehiculoPlaca],
      );
      return result.rows[0].upsert_perfil_domiciliario;
    });
  }

  actualizarDocumentoDomiciliario(
    usuarioId: string,
    tipo: TipoDocumentoDomiciliario,
    path: string,
  ): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        actualizar_documento_domiciliario: boolean;
      }>(
        'select app.actualizar_documento_domiciliario($1, $2, $3) as actualizar_documento_domiciliario',
        [usuarioId, tipo, path],
      );
      return result.rows[0].actualizar_documento_domiciliario;
    });
  }

  desactivarCuenta(usuarioId: string, sid: string): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ desactivar_cuenta: boolean }>(
        'select app.desactivar_cuenta($1, $2) as desactivar_cuenta',
        [usuarioId, sid],
      );
      return result.rows[0].desactivar_cuenta;
    });
  }

  actualizarDisponibilidadDomiciliario(
    usuarioId: string,
    disponible: boolean,
    lat: number | null,
    lng: number | null,
  ): Promise<ResultadoActualizarDisponibilidad> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoActualizarDisponibilidad;
      }>('select * from app.actualizar_disponibilidad_domiciliario($1, $2, $3, $4)', [
        usuarioId,
        disponible,
        lat,
        lng,
      ]);
      return result.rows[0].resultado;
    });
  }
}
