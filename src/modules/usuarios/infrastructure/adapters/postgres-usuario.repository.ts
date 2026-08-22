import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import {
  RegistrarUsuarioInput,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';
import { esViolacionCorreoUnico } from './postgres-unique-violation';

@Injectable()
export class PostgresUsuarioRepository extends UsuarioRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async registrar(input: RegistrarUsuarioInput): Promise<string> {
    try {
      return await this.db.withAppRole(async (client) => {
        const result = await client.query<{ id: string }>(
          'select app.registrar_usuario($1, $2, $3) as id',
          [input.correo, input.passwordHash, input.tipoRegistro],
        );
        return result.rows[0].id;
      });
    } catch (error) {
      if (esViolacionCorreoUnico(error)) {
        throw new CorreoYaRegistradoError();
      }
      throw error;
    }
  }
}
