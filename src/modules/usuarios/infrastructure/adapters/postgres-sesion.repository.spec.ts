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
});
