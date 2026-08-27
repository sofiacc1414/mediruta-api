import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import {
  CrearAdministradorInput,
  CredencialesLogin,
  CuentaActual,
  RegistrarUsuarioInput,
  ResultadoEnviarSolicitudDomiciliario,
  ResultadoSolicitarRol,
  UsuarioRepositoryPort,
  UsuarioRol,
} from '../../domain/ports/usuario.repository.port';
import { esViolacionCorreoUnico } from './postgres-unique-violation';

@Injectable()
export class PostgresUsuarioRepository extends UsuarioRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async registrar(input: RegistrarUsuarioInput): Promise<string> {
    try {
      return await this.db.withAppRole(async (client) => {
        const result = await client.query<{ id: string }>(
          'select app.registrar_usuario($1, $2, $3, $4) as id',
          [
            input.correo,
            input.passwordHash,
            input.tipoRegistro,
            input.altaPaciente ?? true,
          ],
        );
        return result.rows[0].id;
      });
    } catch (error) {
      if (esViolacionCorreoUnico(error)) {
        throw new CorreoYaRegistradoError();
      }
      throw error;
    }
  }

  obtenerCredencialesLogin(correo: string): Promise<CredencialesLogin | null> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{
        usuario_id: string;
        correo: string;
        password_hash: string;
        estado_cuenta: CredencialesLogin['estadoCuenta'];
      }>('select * from app.obtener_credenciales_login($1)', [correo]);

      if (!result.rowCount) {
        return null;
      }

      const row = result.rows[0];
      return {
        usuarioId: row.usuario_id,
        correo: row.correo,
        passwordHash: row.password_hash,
        estadoCuenta: row.estado_cuenta,
      };
    });
  }

  obtenerCuentaActual(usuarioId: string): Promise<CuentaActual | null> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        id: string;
        correo: string;
        estado_cuenta: CuentaActual['estadoCuenta'];
      }>(
        `select id, correo, estado_cuenta
         from public.usuarios
         where id = $1
           and estado_cuenta = 'activa'`,
        [usuarioId],
      );

      if (!result.rowCount) {
        return null;
      }

      return {
        id: result.rows[0].id,
        correo: result.rows[0].correo,
        estadoCuenta: result.rows[0].estado_cuenta,
      };
    });
  }

  obtenerRoles(usuarioId: string): Promise<UsuarioRol[]> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<UsuarioRol>(
        `select r.codigo, ur.estado
         from public.usuario_roles ur
         inner join public.roles r on r.id = ur.rol_id
         where ur.usuario_id = $1`,
        [usuarioId],
      );
      return result.rows;
    });
  }

  solicitarRolPaciente(usuarioId: string): Promise<ResultadoSolicitarRol> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ solicitar_rol_paciente: ResultadoSolicitarRol }>(
        'select app.solicitar_rol_paciente($1) as solicitar_rol_paciente',
        [usuarioId],
      );
      return result.rows[0].solicitar_rol_paciente;
    });
  }

  solicitarRolDomiciliario(usuarioId: string): Promise<ResultadoSolicitarRol> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        solicitar_rol_domiciliario: ResultadoSolicitarRol;
      }>('select app.solicitar_rol_domiciliario($1) as solicitar_rol_domiciliario', [
        usuarioId,
      ]);
      return result.rows[0].solicitar_rol_domiciliario;
    });
  }

  enviarSolicitudDomiciliario(
    usuarioId: string,
  ): Promise<ResultadoEnviarSolicitudDomiciliario> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{
        resultado: string;
        faltantes: string[] | null;
      }>('select * from app.enviar_solicitud_domiciliario($1)', [usuarioId]);
      const fila = result.rows[0];

      if (fila.resultado === 'incompleta') {
        return { resultado: 'incompleta', faltantes: fila.faltantes ?? [] };
      }
      if (fila.resultado === 'enviada' || fila.resultado === 'no_encontrada') {
        return { resultado: fila.resultado };
      }
      throw new Error(
        `Resultado inesperado de app.enviar_solicitud_domiciliario: ${fila.resultado}`,
      );
    });
  }

  async crearAdministrador(input: CrearAdministradorInput): Promise<string> {
    try {
      return await this.db.withAppRole(async (client) => {
        const result = await client.query<{ id: string }>(
          'select app.crear_administrador($1, $2, $3, $4) as id',
          [
            input.correo,
            input.passwordHash,
            input.nombreCompleto ?? null,
            input.telefono ?? null,
          ],
        );
        return result.rows[0].id;
      });
    } catch (error) {
      if (esViolacionCorreoUnico(error)) {
        throw new CorreoYaRegistradoError();
      }
      throw error;
    }
  }
}
