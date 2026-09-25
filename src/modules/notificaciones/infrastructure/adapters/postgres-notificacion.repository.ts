import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  DatosPedidoNotificacion,
  NotificacionGuardada,
  NotificacionRepositoryPort,
  NuevaNotificacion,
  ReferenciaNotificacion,
  TipoNotificacion,
} from '../../domain/ports/notificacion.repository.port';

type FilaNotificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  referencia_tipo: ReferenciaNotificacion;
  referencia_id: string | null;
  leida: boolean;
  creado_en: string;
};

function instante(valor: string | Date): string {
  if (valor instanceof Date) return valor.toISOString();
  return valor;
}

type FilaPedido = {
  paciente_id: string;
  domiciliario_id: string | null;
  estado: string;
  codigo_pedido: string | null;
};

@Injectable()
export class PostgresNotificacionRepository extends NotificacionRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async guardar(datos: NuevaNotificacion): Promise<string | null> {
    return this.db.withoutUserContext(async (client) => {
      const result = await client.query<{ id: string }>(
        `insert into public.notificaciones (
           destinatario_id, tipo, titulo, mensaje,
           referencia_tipo, referencia_id, clave_evento
         ) values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (destinatario_id, tipo, clave_evento) do nothing
         returning id`,
        [
          datos.destinatarioId,
          datos.tipo,
          datos.titulo,
          datos.mensaje,
          datos.referenciaTipo,
          datos.referenciaId,
          datos.claveEvento,
        ],
      );
      return result.rows[0]?.id ?? null;
    });
  }

  async listar(usuarioId: string): Promise<NotificacionGuardada[]> {
    try {
      return await this.db.withUserContext(usuarioId, async (client) => {
        const result = await client.query<FilaNotificacion>(
          'select * from app.listar_notificaciones($1)',
          [usuarioId],
        );
        return result.rows.map((fila) => ({
          id: fila.id,
          tipo: fila.tipo,
          titulo: fila.titulo,
          mensaje: fila.mensaje,
          referenciaTipo: fila.referencia_tipo,
          referenciaId: fila.referencia_id,
          leida: fila.leida,
          creadoEn: instante(fila.creado_en),
        }));
      });
    } catch (error) {
      const codigo = (error as { code?: string }).code;
      // 42P01 tabla inexistente, 42883 función inexistente: la migración
      // de notificaciones todavía no está aplicada. Lista vacía, no 500.
      if (codigo === '42P01' || codigo === '42883') {
        return [];
      }
      throw error;
    }
  }

  async marcarLeida(usuarioId: string, notificacionId: string): Promise<boolean> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ marcar_notificacion_leida: boolean }>(
        'select app.marcar_notificacion_leida($1, $2) as marcar_notificacion_leida',
        [usuarioId, notificacionId],
      );
      return result.rows[0]?.marcar_notificacion_leida === true;
    });
  }

  async datosPedido(solicitudId: string): Promise<DatosPedidoNotificacion | null> {
    return this.db.withoutUserContext(async (client) => {
      const result = await client.query<FilaPedido>(
        `select paciente_id, domiciliario_id, estado, codigo_pedido
         from public.solicitudes
         where id = $1`,
        [solicitudId],
      );
      const fila = result.rows[0];
      if (!fila) return null;
      return {
        pacienteId: fila.paciente_id,
        domiciliarioId: fila.domiciliario_id,
        estado: fila.estado,
        codigoPedido: fila.codigo_pedido,
      };
    });
  }

  async tokensPush(usuarioId: string): Promise<string[]> {
    return this.db.withoutUserContext(async (client) => {
      const result = await client.query<{ token: string }>(
        'select token from public.dispositivo_push where usuario_id = $1',
        [usuarioId],
      );
      return result.rows.map((fila) => fila.token);
    });
  }

  registrarDispositivo(
    usuarioId: string,
    token: string,
    plataforma: string,
  ): Promise<void> {
    return this.db.withUserContext(usuarioId, async (client) => {
      await client.query(
        'select app.registrar_dispositivo_push($1, $2, $3)',
        [usuarioId, token, plataforma],
      );
    });
  }
}
