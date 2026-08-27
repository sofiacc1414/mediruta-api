import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  DomiciliarioPendiente,
  PerfilDomiciliarioValidacion,
  ResultadoAprobar,
  ResultadoRechazar,
  ValidacionDomiciliarioRepositoryPort,
  ValidacionHistorial,
} from '../../domain/ports/validacion-domiciliario.repository.port';

type FilaPendiente = {
  usuario_id: string;
  nombre_completo: string | null;
  telefono: string | null;
  solicitado_en: string;
};

type FilaDetalle = {
  nombre_completo: string | null;
  telefono: string | null;
  estado: PerfilDomiciliarioValidacion['estado'];
  solicitado_en: string;
  direccion: string | null;
  vehiculo_tipo: string | null;
  vehiculo_placa: string | null;
  cedula_frente_path: string | null;
  cedula_reverso_path: string | null;
  licencia_path: string | null;
  soat_path: string | null;
  tecnicomecanica_path: string | null;
};

type FilaHistorial = {
  decision: ValidacionHistorial['decision'];
  motivo: string | null;
  creado_en: string;
  admin_correo: string;
};

type FilaAprobar = { resultado: string; faltantes: string[] | null };

/**
 * Todas las lecturas/escrituras cruzan cuentas (el admin decide sobre
 * OTRO usuario) — por eso `withUserContext` siempre se llama con el id
 * del admin (para RLS/auditoría de quién ejecuta la sesión), y el id
 * del domiciliario objetivo viaja como parámetro explícito de cada
 * función `app.*`, nunca como el "usuario actual" de la sesión.
 */
@Injectable()
export class PostgresValidacionDomiciliarioRepository extends ValidacionDomiciliarioRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  listarPendientes(adminId: string): Promise<DomiciliarioPendiente[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaPendiente>(
        'select * from app.listar_domiciliarios_pendientes($1)',
        [adminId],
      );
      return result.rows.map((fila) => ({
        usuarioId: fila.usuario_id,
        nombreCompleto: fila.nombre_completo,
        telefono: fila.telefono,
        solicitadoEn: fila.solicitado_en,
      }));
    });
  }

  obtenerDetalle(
    adminId: string,
    domiciliarioId: string,
  ): Promise<PerfilDomiciliarioValidacion | null> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaDetalle>(
        'select * from app.obtener_detalle_domiciliario($1, $2)',
        [adminId, domiciliarioId],
      );

      if (!result.rowCount) {
        return null;
      }

      const fila = result.rows[0];
      return {
        nombreCompleto: fila.nombre_completo,
        telefono: fila.telefono,
        estado: fila.estado,
        solicitadoEn: fila.solicitado_en,
        direccion: fila.direccion,
        vehiculoTipo: fila.vehiculo_tipo,
        vehiculoPlaca: fila.vehiculo_placa,
        cedulaFrentePath: fila.cedula_frente_path,
        cedulaReversoPath: fila.cedula_reverso_path,
        licenciaPath: fila.licencia_path,
        soatPath: fila.soat_path,
        tecnicomecanicaPath: fila.tecnicomecanica_path,
      };
    });
  }

  listarHistorial(
    adminId: string,
    domiciliarioId: string,
  ): Promise<ValidacionHistorial[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaHistorial>(
        'select * from app.listar_validaciones_domiciliario($1, $2)',
        [adminId, domiciliarioId],
      );
      return result.rows.map((fila) => ({
        decision: fila.decision,
        motivo: fila.motivo,
        creadoEn: fila.creado_en,
        adminCorreo: fila.admin_correo,
      }));
    });
  }

  aprobar(adminId: string, domiciliarioId: string): Promise<ResultadoAprobar> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaAprobar>(
        'select * from app.aprobar_domiciliario($1, $2)',
        [adminId, domiciliarioId],
      );
      const fila = result.rows[0];

      if (fila.resultado === 'incompleto') {
        return { resultado: 'incompleto', faltantes: fila.faltantes ?? [] };
      }
      if (
        fila.resultado === 'aprobado' ||
        fila.resultado === 'no_encontrado' ||
        fila.resultado === 'no_autorizado'
      ) {
        return { resultado: fila.resultado };
      }
      throw new Error(
        `Resultado inesperado de app.aprobar_domiciliario: ${fila.resultado}`,
      );
    });
  }

  async rechazar(
    adminId: string,
    domiciliarioId: string,
    motivo: string,
  ): Promise<ResultadoRechazar> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        rechazar_domiciliario: ResultadoRechazar;
      }>(
        'select app.rechazar_domiciliario($1, $2, $3) as rechazar_domiciliario',
        [adminId, domiciliarioId, motivo],
      );
      return result.rows[0].rechazar_domiciliario;
    });
  }
}
