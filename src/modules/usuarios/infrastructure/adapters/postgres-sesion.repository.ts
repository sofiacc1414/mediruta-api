import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  CrearSesionInput,
  RotarSesionInput,
  RotarSesionResultado,
  SesionRepositoryPort,
} from '../../domain/ports/sesion.repository.port';

@Injectable()
export class PostgresSesionRepository extends SesionRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  crear(input: CrearSesionInput): Promise<string> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{ sid: string }>(
        'select app.crear_sesion($1, $2, $3, $4, $5) as sid',
        [
          input.usuarioId,
          input.refreshTokenHash,
          input.expiraEn,
          input.userAgent ?? null,
          input.ip ?? null,
        ],
      );
      return result.rows[0].sid;
    });
  }

  rotar(input: RotarSesionInput): Promise<RotarSesionResultado | null> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{
        usuario_id: string;
        sid: string;
      }>('select * from app.rotar_sesion($1, $2, $3, $4, $5)', [
        input.refreshTokenHashActual,
        input.nuevoRefreshTokenHash,
        input.nuevaExpiraEn,
        input.userAgent ?? null,
        input.ip ?? null,
      ]);

      if (!result.rowCount) {
        return null;
      }

      return {
        usuarioId: result.rows[0].usuario_id,
        sid: result.rows[0].sid,
      };
    });
  }
}
