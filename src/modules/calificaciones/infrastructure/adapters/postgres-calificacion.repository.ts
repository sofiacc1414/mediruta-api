import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  Calificacion,
  CodigoResultadoCalificacion,
  FilaCalificacion,
  PedidoCalificacion,
} from '../../domain/calificacion';
import {
  CalificacionRepositoryPort,
  GuardarCalificacion,
  ResultadoMutacion,
} from '../../domain/ports/calificacion.repository.port';

type FilaPedido = {
  id: string;
  codigo_pedido: string | null;
  estado: string;
  creado_en: string | Date;
  cantidad_medicamentos: number;
  tiene_calificacion_activa: boolean;
};

function instante(valor: string | Date | null): string {
  if (valor instanceof Date) return valor.toISOString();
  return valor ?? '';
}

function mapear(fila: FilaCalificacion): ResultadoMutacion {
  if (fila.resultado !== 'ok' || !fila.id) {
    return { codigo: fila.resultado, calificacion: null };
  }
  const calificacion: Calificacion = {
    id: fila.id,
    solicitudId: fila.solicitud_id ?? '',
    puntuacion: Number(fila.puntuacion),
    comentario: fila.comentario,
    estado: fila.estado ?? 'activa',
    creadoEn: instante(fila.creado_en),
    actualizadoEn: instante(fila.actualizado_en),
  };
  return { codigo: 'ok', calificacion };
}

@Injectable()
export class PostgresCalificacionRepository extends CalificacionRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async listarPedidos(usuarioId: string): Promise<PedidoCalificacion[]> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaPedido>(
        'select * from app.listar_pedidos_calificacion($1)',
        [usuarioId],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        creadoEn: instante(fila.creado_en),
        cantidadMedicamentos: Number(fila.cantidad_medicamentos),
        tieneCalificacionActiva: fila.tiene_calificacion_activa,
      }));
    });
  }

  async obtener(usuarioId: string, solicitudId: string): Promise<ResultadoMutacion> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaCalificacion>(
        'select * from app.obtener_calificacion($1, $2)',
        [usuarioId, solicitudId],
      );
      const fila = result.rows[0];
      if (!fila) {
        return { codigo: 'sin_calificacion', calificacion: null };
      }
      return mapear(fila);
    });
  }

  async crear(datos: GuardarCalificacion): Promise<ResultadoMutacion> {
    return this.mutar('app.crear_calificacion', datos);
  }

  async actualizar(datos: GuardarCalificacion): Promise<ResultadoMutacion> {
    return this.mutar('app.actualizar_calificacion', datos);
  }

  async retirar(
    usuarioId: string,
    solicitudId: string,
  ): Promise<CodigoResultadoCalificacion> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<{ retirar_calificacion: string }>(
        'select app.retirar_calificacion($1, $2) as retirar_calificacion',
        [usuarioId, solicitudId],
      );
      return (result.rows[0]?.retirar_calificacion ??
        'sin_calificacion') as CodigoResultadoCalificacion;
    });
  }

  private async mutar(
    funcion: string,
    datos: GuardarCalificacion,
  ): Promise<ResultadoMutacion> {
    return this.db.withUserContext(datos.usuarioId, async (client) => {
      const result = await client.query<FilaCalificacion>(
        `select * from ${funcion}($1, $2, $3, $4)`,
        [datos.usuarioId, datos.solicitudId, datos.puntuacion, datos.comentario],
      );
      const fila = result.rows[0];
      if (!fila) {
        return { codigo: 'sin_calificacion', calificacion: null };
      }
      return mapear(fila);
    });
  }
}
