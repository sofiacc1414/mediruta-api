import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { TipoRegistro } from '../../domain/value-objects/tipo-registro';
import { PostgresUsuarioRepository } from './postgres-usuario.repository';

describe('PostgresUsuarioRepository', () => {
  it('transforma 23505 de usuarios_correo_key en CorreoYaRegistradoError', async () => {
    const db = {
      withAppRole: jest.fn().mockRejectedValue({
        code: '23505',
        constraint: 'usuarios_correo_key',
      }),
    } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);

    await expect(
      repository.registrar({
        correo: 'persona@mail.com',
        passwordHash: 'hash',
        tipoRegistro: TipoRegistro.PACIENTE,
      }),
    ).rejects.toBeInstanceOf(CorreoYaRegistradoError);
  });
});
