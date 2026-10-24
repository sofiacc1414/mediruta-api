import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  FarmaciaAliada,
  FarmaciaAliadaAdmin,
  ResultadoEliminarFarmaciaAliadaAdmin,
  ResultadoGuardarFarmaciaAliadaAdmin,
} from '../../domain/farmacia-aliada';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';

type FilaFarmaciaAliada = {
  id: string;
  eps: string;
  nombre_farmacia: string;
  ciudad: string;
  departamento: string | null;
  direccion: string | null;
  telefono: string | null;
};

type FilaFarmaciaAliadaAdmin = FilaFarmaciaAliada & { activo: boolean };

function aFarmaciaAliada(fila: FilaFarmaciaAliada): FarmaciaAliada {
  return {
    id: fila.id,
    eps: fila.eps,
    nombreFarmacia: fila.nombre_farmacia,
    ciudad: fila.ciudad,
    departamento: fila.departamento,
    direccion: fila.direccion,
    telefono: fila.telefono,
  };
}

@Injectable()
export class PostgresFarmaciaAliadaRepository extends FarmaciaAliadaRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  listarPorEps(usuarioId: string, eps: string): Promise<FarmaciaAliada[]> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaFarmaciaAliada>(
        'select * from app.listar_farmacias_aliadas_por_eps($1, $2)',
        [usuarioId, eps],
      );
      return result.rows.map(aFarmaciaAliada);
    });
  }

  listarAdmin(adminId: string): Promise<FarmaciaAliadaAdmin[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaFarmaciaAliadaAdmin>(
        'select * from app.listar_farmacias_aliadas_admin($1)',
        [adminId],
      );
      return result.rows.map((fila) => ({
        ...aFarmaciaAliada(fila),
        activo: fila.activo,
      }));
    });
  }

  guardarAdmin(
    adminId: string,
    id: string | null,
    eps: string,
    nombreFarmacia: string,
    ciudad: string,
    departamento: string | null,
    direccion: string | null,
    telefono: string | null,
    activo: boolean,
  ): Promise<ResultadoGuardarFarmaciaAliadaAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: string;
        id: string | null;
      }>(
        'select * from app.guardar_farmacia_aliada_admin($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [
          adminId,
          id,
          eps,
          nombreFarmacia,
          ciudad,
          departamento,
          direccion,
          telefono,
          activo,
        ],
      );
      const fila = result.rows[0];
      if (fila.resultado === 'guardado' && fila.id) {
        return { resultado: 'guardado', id: fila.id };
      }
      return {
        resultado: fila.resultado as
          'no_autorizado' | 'invalido' | 'no_encontrado',
      };
    });
  }

  eliminarAdmin(
    adminId: string,
    id: string,
  ): Promise<ResultadoEliminarFarmaciaAliadaAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoEliminarFarmaciaAliadaAdmin;
      }>('select * from app.eliminar_farmacia_aliada_admin($1, $2)', [
        adminId,
        id,
      ]);
      return result.rows[0].resultado;
    });
  }
}
