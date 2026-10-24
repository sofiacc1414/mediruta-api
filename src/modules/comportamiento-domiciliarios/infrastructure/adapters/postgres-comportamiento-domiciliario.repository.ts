import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  DetalleComportamientoDomiciliario,
  EventoComportamiento,
  ResumenComportamientoDomiciliario,
} from '../../domain/comportamiento-domiciliario';
import { ComportamientoDomiciliarioRepositoryPort } from '../../domain/ports/comportamiento-domiciliario.repository.port';

type FilaResumen = {
  domiciliario_id: string;
  nombre_completo: string;
  correo: string;
  estado_cuenta: string;
  entregas_realizadas: string;
  cancelaciones: string;
  incidentes_reportados: string;
  incidentes_abiertos: string;
  calificacion_promedio: string | null;
  calificaciones_cantidad: string;
};

type FilaEvento = {
  tipo: 'entrega' | 'cancelacion' | 'incidente' | 'calificacion';
  solicitud_id: string;
  codigo_pedido: string | null;
  detalle: string | null;
  puntuacion: number | null;
  resuelto: boolean | null;
  fecha: string;
};

function mapearResumen(fila: FilaResumen): ResumenComportamientoDomiciliario {
  return {
    domiciliarioId: fila.domiciliario_id,
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    estadoCuenta: fila.estado_cuenta as ResumenComportamientoDomiciliario['estadoCuenta'],
    entregasRealizadas: Number(fila.entregas_realizadas),
    cancelaciones: Number(fila.cancelaciones),
    incidentesReportados: Number(fila.incidentes_reportados),
    incidentesAbiertos: Number(fila.incidentes_abiertos),
    calificacionPromedio:
      fila.calificacion_promedio === null ? null : Number(fila.calificacion_promedio),
    calificacionesCantidad: Number(fila.calificaciones_cantidad),
    rechazos: null,
  };
}

function mapearEvento(fila: FilaEvento): EventoComportamiento {
  const base = {
    solicitudId: fila.solicitud_id,
    codigoPedido: fila.codigo_pedido,
    fecha: fila.fecha,
  };
  switch (fila.tipo) {
    case 'entrega':
      return { tipo: 'entrega', ...base };
    case 'cancelacion':
      return { tipo: 'cancelacion', ...base };
    case 'incidente':
      return {
        tipo: 'incidente',
        ...base,
        detalle: fila.detalle ?? '',
        resuelto: fila.resuelto ?? false,
      };
    case 'calificacion':
      return {
        tipo: 'calificacion',
        ...base,
        puntuacion: fila.puntuacion ?? 0,
        comentario: fila.detalle,
      };
  }
}

@Injectable()
export class PostgresComportamientoDomiciliarioRepository extends ComportamientoDomiciliarioRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  listarResumen(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenComportamientoDomiciliario[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaResumen>(
        'select * from app.listar_resumen_comportamiento_domiciliarios($1, $2, $3)',
        [adminId, desde, hasta],
      );
      return result.rows.map(mapearResumen);
    });
  }

  obtenerDetalle(
    adminId: string,
    domiciliarioId: string,
    desde: string,
    hasta: string,
  ): Promise<DetalleComportamientoDomiciliario | null> {
    return this.db.withUserContext(adminId, async (client) => {
      const resultResumen = await client.query<FilaResumen>(
        'select * from app.obtener_resumen_comportamiento_domiciliario($1, $2, $3, $4)',
        [adminId, domiciliarioId, desde, hasta],
      );
      if (!resultResumen.rowCount) {
        return null;
      }

      const resultEventos = await client.query<FilaEvento>(
        'select * from app.listar_eventos_comportamiento_domiciliario($1, $2, $3, $4)',
        [adminId, domiciliarioId, desde, hasta],
      );

      return {
        resumen: mapearResumen(resultResumen.rows[0]),
        eventos: resultEventos.rows.map(mapearEvento),
      };
    });
  }
}
