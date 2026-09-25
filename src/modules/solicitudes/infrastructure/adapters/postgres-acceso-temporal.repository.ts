import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  AccesoTemporalRepositoryPort,
  PuntoFarmaciaAcceso,
  RegistroAcceso,
} from '../../domain/ports/acceso-temporal.repository.port';

@Injectable()
export class PostgresAccesoTemporalRepository extends AccesoTemporalRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async puntoFarmacia(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<PuntoFarmaciaAcceso | null> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{
        estado: string;
        farmacia_lat: number | null;
        farmacia_lng: number | null;
      }>('select * from app.punto_farmacia_para_acceso($1, $2)', [
        domiciliarioId,
        solicitudId,
      ]);
      const fila = result.rows[0];
      if (!fila) return null;
      return {
        estado: fila.estado,
        farmaciaLat: fila.farmacia_lat,
        farmaciaLng: fila.farmacia_lng,
      };
    });
  }

  async registrar(datos: RegistroAcceso): Promise<void> {
    await this.db.withoutUserContext(async (client) => {
      await client.query(
        `update public.acceso_temporal
         set estado = 'expirado', resultado = 'expirado'
         where solicitud_id = $1
           and domiciliario_id = $2
           and estado = 'activo'
           and expira_en <= now()`,
        [datos.solicitudId, datos.domiciliarioId],
      );
      if (datos.resultado === 'permitido') {
        await client.query(
          `update public.acceso_temporal
           set estado = 'revocado'
           where solicitud_id = $1
             and domiciliario_id = $2
             and estado = 'activo'`,
          [datos.solicitudId, datos.domiciliarioId],
        );
      }
      const estado =
        datos.resultado === 'permitido'
          ? 'activo'
          : datos.resultado === 'expirado'
            ? 'expirado'
            : 'denegado';
      await client.query(
        `insert into public.acceso_temporal (
           solicitud_id, domiciliario_id, expira_en,
           ubicacion_lat, ubicacion_lng, estado, resultado
         ) values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          datos.solicitudId,
          datos.domiciliarioId,
          datos.expiraEn,
          datos.lat,
          datos.lng,
          estado,
          datos.resultado,
        ],
      );
    });
  }

  async revocarPorPedido(solicitudId: string): Promise<void> {
    await this.db.withoutUserContext(async (client) => {
      await client.query(
        `update public.acceso_temporal
         set estado = 'revocado'
         where solicitud_id = $1
           and estado = 'activo'`,
        [solicitudId],
      );
    });
  }
}
