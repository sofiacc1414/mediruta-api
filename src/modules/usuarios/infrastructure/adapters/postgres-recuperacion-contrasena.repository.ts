import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  CrearRecuperacionInput,
  RecuperacionContrasenaRepositoryPort,
  RestablecerRecuperacionInput,
} from '../../domain/ports/recuperacion-contrasena.repository.port';

@Injectable()
export class PostgresRecuperacionContrasenaRepository extends RecuperacionContrasenaRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  crear(input: CrearRecuperacionInput): Promise<boolean> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{ creada: boolean }>(
        'select app.crear_recuperacion_contrasena($1, $2, $3) as creada',
        [input.correo, input.codigoHash, input.expiraEn],
      );
      return result.rows[0].creada;
    });
  }

  restablecer(input: RestablecerRecuperacionInput): Promise<boolean> {
    return this.db.withAppRole(async (client) => {
      const result = await client.query<{ restablecida: boolean }>(
        'select app.restablecer_contrasena($1, $2, $3) as restablecida',
        [input.correo, input.codigoHash, input.nuevoPasswordHash],
      );
      return result.rows[0].restablecida;
    });
  }
}
