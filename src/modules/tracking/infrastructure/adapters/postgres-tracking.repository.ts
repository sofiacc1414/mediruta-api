import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  PosicionEnVivo,
  ResultadoActualizarUbicacion,
  ResultadoObtenerPosicion,
  TrackingRepositoryPort,
} from '../../domain/ports/tracking.repository.port';

type FilaActualizar = { resultado: ResultadoActualizarUbicacion };

type FilaObtener = {
  resultado: 'ok' | 'no_autorizado' | 'pedido_no_encontrado' | 'sin_tracking_disponible';
  estado: string | null;
  domiciliario_lat: number | null;
  domiciliario_lng: number | null;
  ubicacion_actualizada_en: string | Date | null;
  farmacia_lat: number | null;
  farmacia_lng: number | null;
  entrega_lat: number | null;
  entrega_lng: number | null;
};

function instanteONull(valor: string | Date | null): string | null {
  if (valor === null) return null;
  return valor instanceof Date ? valor.toISOString() : valor;
}

@Injectable()
export class PostgresTrackingRepository extends TrackingRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async actualizarUbicacion(
    domiciliarioId: string,
    solicitudId: string,
    lat: number,
    lng: number,
  ): Promise<ResultadoActualizarUbicacion> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaActualizar>(
        'select * from app.actualizar_ubicacion_en_vivo($1, $2, $3, $4)',
        [domiciliarioId, solicitudId, lat, lng],
      );
      return result.rows[0].resultado;
    });
  }

  async obtenerPosicion(usuarioId: string, solicitudId: string): Promise<ResultadoObtenerPosicion> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaObtener>(
        'select * from app.obtener_posicion_en_vivo($1, $2)',
        [usuarioId, solicitudId],
      );
      const fila = result.rows[0];
      if (fila.resultado !== 'ok') {
        return { resultado: fila.resultado };
      }
      const posicion: PosicionEnVivo = {
        estado: fila.estado!,
        domiciliarioLat: fila.domiciliario_lat,
        domiciliarioLng: fila.domiciliario_lng,
        ubicacionActualizadaEn: instanteONull(fila.ubicacion_actualizada_en),
        farmaciaLat: fila.farmacia_lat,
        farmaciaLng: fila.farmacia_lng,
        entregaLat: fila.entrega_lat,
        entregaLng: fila.entrega_lng,
      };
      return { resultado: 'ok', posicion };
    });
  }
}
