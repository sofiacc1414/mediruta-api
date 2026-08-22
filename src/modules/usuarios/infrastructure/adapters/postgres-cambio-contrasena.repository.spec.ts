import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { PostgresCambioContrasenaRepository } from './postgres-cambio-contrasena.repository';

describe('PostgresCambioContrasenaRepository', () => {
  it('obtenerPasswordHash usa withAppRole y la firma de PostgreSQL', async () => {
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ password_hash: 'hash-actual' }],
    });
    const withAppRole = jest.fn(async (callback) => callback({ query }));
    const db = { withAppRole } as unknown as DatabaseService;

    const repository = new PostgresCambioContrasenaRepository(db);

    await expect(
      repository.obtenerPasswordHash('usuario-uuid', 'sid-uuid'),
    ).resolves.toBe('hash-actual');

    expect(withAppRole).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      'select * from app.obtener_password_hash_cambio_contrasena($1, $2)',
      ['usuario-uuid', 'sid-uuid'],
    );
  });

  it('obtenerPasswordHash retorna null cuando no hay filas', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresCambioContrasenaRepository(db);

    await expect(
      repository.obtenerPasswordHash('usuario-uuid', 'sid-uuid'),
    ).resolves.toBeNull();
  });

  it('cambiar usa withAppRole y app.cambiar_contrasena_autenticada', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ cambiada: true }],
    });
    const withAppRole = jest.fn(async (callback) => callback({ query }));
    const db = { withAppRole } as unknown as DatabaseService;

    const repository = new PostgresCambioContrasenaRepository(db);

    await expect(
      repository.cambiar(
        'usuario-uuid',
        'sid-uuid',
        'hash-actual',
        'hash-nuevo',
      ),
    ).resolves.toBe(true);

    expect(withAppRole).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      'select app.cambiar_contrasena_autenticada($1, $2, $3, $4) as cambiada',
      ['usuario-uuid', 'sid-uuid', 'hash-actual', 'hash-nuevo'],
    );
  });

  it('cambiar interpreta false cuando PostgreSQL no cambia', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ cambiada: false }],
    });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresCambioContrasenaRepository(db);

    await expect(
      repository.cambiar(
        'usuario-uuid',
        'sid-uuid',
        'hash-desactualizado',
        'hash-nuevo',
      ),
    ).resolves.toBe(false);
  });
});
