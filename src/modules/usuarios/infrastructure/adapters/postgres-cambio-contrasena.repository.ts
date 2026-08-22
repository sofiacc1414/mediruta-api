import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { CambioContrasenaRepositoryPort } from '../../domain/ports/cambio-contrasena.repository.port';

@Injectable()
export class PostgresCambioContrasenaRepository extends CambioContrasenaRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  obtenerPasswordHash(usuarioId: string, sid: string): Promise<string | null> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{ password_hash: string }>(
        'select * from app.obtener_password_hash_cambio_contrasena($1, $2)',
        [usuarioId, sid],
      );
      if (!result.rowCount) {
        return null;
      }
      return result.rows[0].password_hash;
    });
  }

  cambiar(
    usuarioId: string,
    sid: string,
    passwordHashActualEsperado: string,
    nuevoPasswordHash: string,
  ): Promise<boolean> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{ cambiada: boolean }>(
        'select app.cambiar_contrasena_autenticada($1, $2, $3, $4) as cambiada',
        [usuarioId, sid, passwordHashActualEsperado, nuevoPasswordHash],
      );
      return result.rows[0].cambiada;
    });
  }
}
