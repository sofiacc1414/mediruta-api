import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import { PostgresSesionRepository } from './postgres-sesion.repository';

describe('PostgresSesionRepository', () => {
  it('crea la sesión únicamente vía app.crear_sesion', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ sid: 'sid-uuid' }],
    });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresSesionRepository(db);
    const expiraEn = new Date('2026-08-29T00:00:00.000Z');

    await expect(
      repository.crear({
        usuarioId: 'usuario-uuid',
        refreshTokenHash: 'solo-hash',
        expiraEn,
        userAgent: 'MediRuta/1.0',
        ip: '127.0.0.1',
      }),
    ).resolves.toBe('sid-uuid');

    expect(query).toHaveBeenCalledWith(
      'select app.crear_sesion($1, $2, $3, $4, $5) as sid',
      ['usuario-uuid', 'solo-hash', expiraEn, 'MediRuta/1.0', '127.0.0.1'],
    );
  });

  it('rota la sesión únicamente vía app.rotar_sesion', async () => {
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ usuario_id: 'usuario-uuid', sid: 'sid-nuevo' }],
    });
    const withAppRole = jest.fn(async (callback) => callback({ query }));
    const db = { withAppRole } as unknown as DatabaseService;

    const repository = new PostgresSesionRepository(db);
    const nuevaExpiraEn = new Date('2026-08-29T00:00:00.000Z');

    await expect(
      repository.rotar({
        refreshTokenHashActual: 'hash-actual',
        nuevoRefreshTokenHash: 'hash-nuevo',
        nuevaExpiraEn,
        userAgent: 'MediRuta/1.0',
        ip: '127.0.0.1',
      }),
    ).resolves.toEqual({
      usuarioId: 'usuario-uuid',
      sid: 'sid-nuevo',
    });

    expect(withAppRole).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      'select * from app.rotar_sesion($1, $2, $3, $4, $5)',
      ['hash-actual', 'hash-nuevo', nuevaExpiraEn, 'MediRuta/1.0', '127.0.0.1'],
    );
  });

  it('devuelve null cuando app.rotar_sesion no retorna filas', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresSesionRepository(db);

    await expect(
      repository.rotar({
        refreshTokenHashActual: 'hash-inexistente',
        nuevoRefreshTokenHash: 'hash-nuevo',
        nuevaExpiraEn: new Date('2026-08-29T00:00:00.000Z'),
      }),
    ).resolves.toBeNull();
  });
});
