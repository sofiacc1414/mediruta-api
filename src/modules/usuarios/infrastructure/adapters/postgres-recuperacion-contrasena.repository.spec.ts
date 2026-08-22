import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { PostgresRecuperacionContrasenaRepository } from './postgres-recuperacion-contrasena.repository';

describe('PostgresRecuperacionContrasenaRepository', () => {
  const expiraEn = new Date('2026-08-22T16:10:00.000Z');

  it('crea la recuperación únicamente vía app.crear_recuperacion_contrasena', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ creada: true }],
    });
    const withAppRole = jest.fn(async (callback) => callback({ query }));
    const db = { withAppRole } as unknown as DatabaseService;

    const repository = new PostgresRecuperacionContrasenaRepository(db);

    await expect(
      repository.crear({
        correo: 'persona@mail.com',
        codigoHash: 'hmac-del-otp',
        expiraEn,
      }),
    ).resolves.toBe(true);

    expect(withAppRole).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      'select app.crear_recuperacion_contrasena($1, $2, $3) as creada',
      ['persona@mail.com', 'hmac-del-otp', expiraEn],
    );
  });

  it('interpreta false cuando PostgreSQL no crea la recuperación', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ creada: false }],
    });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresRecuperacionContrasenaRepository(db);

    await expect(
      repository.crear({
        correo: 'nadie@mail.com',
        codigoHash: 'hmac-del-otp',
        expiraEn,
      }),
    ).resolves.toBe(false);
  });

  it('restablece únicamente vía app.restablecer_contrasena', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ restablecida: true }],
    });
    const withAppRole = jest.fn(async (callback) => callback({ query }));
    const db = { withAppRole } as unknown as DatabaseService;

    const repository = new PostgresRecuperacionContrasenaRepository(db);

    await expect(
      repository.restablecer({
        correo: 'persona@mail.com',
        codigoHash: 'hmac-del-otp',
        nuevoPasswordHash: 'hash-bcrypt',
      }),
    ).resolves.toBe(true);

    expect(withAppRole).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      'select app.restablecer_contrasena($1, $2, $3) as restablecida',
      ['persona@mail.com', 'hmac-del-otp', 'hash-bcrypt'],
    );
  });

  it('interpreta false cuando PostgreSQL no restablece', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ restablecida: false }],
    });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresRecuperacionContrasenaRepository(db);

    await expect(
      repository.restablecer({
        correo: 'persona@mail.com',
        codigoHash: 'hmac-incorrecto',
        nuevoPasswordHash: 'hash-bcrypt',
      }),
    ).resolves.toBe(false);
  });
});
