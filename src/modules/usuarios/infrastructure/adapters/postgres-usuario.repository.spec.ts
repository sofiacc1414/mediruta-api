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

  it('consulta credenciales solo vía app.obtener_credenciales_login', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);

    await expect(
      repository.obtenerCredencialesLogin('persona@mail.com'),
    ).resolves.toBeNull();
    expect(query).toHaveBeenCalledWith(
      'select * from app.obtener_credenciales_login($1)',
      ['persona@mail.com'],
    );
  });

  it('mapea la fila de credenciales al modelo de aplicación', async () => {
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          usuario_id: 'usuario-uuid',
          correo: 'persona@mail.com',
          password_hash: 'hash-bcrypt',
          estado_cuenta: 'activa',
        },
      ],
    });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);

    await expect(
      repository.obtenerCredencialesLogin('persona@mail.com'),
    ).resolves.toEqual({
      usuarioId: 'usuario-uuid',
      correo: 'persona@mail.com',
      passwordHash: 'hash-bcrypt',
      estadoCuenta: 'activa',
    });
  });

  it('consulta roles con withUserContext para aplicar RLS', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ codigo: 'PACIENTE', estado: 'habilitado' }],
    });
    const withUserContext = jest.fn(async (_id, callback) =>
      callback({ query }),
    );
    const db = { withUserContext } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    const roles = await repository.obtenerRoles('usuario-uuid');

    expect(withUserContext).toHaveBeenCalledWith(
      'usuario-uuid',
      expect.any(Function),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('from public.usuario_roles ur'),
      ['usuario-uuid'],
    );
    expect(roles).toEqual([{ codigo: 'PACIENTE', estado: 'habilitado' }]);
  });

  it('consulta la cuenta actual con withUserContext y sin password_hash', async () => {
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: 'usuario-uuid',
          correo: 'persona@mail.com',
          estado_cuenta: 'activa',
        },
      ],
    });
    const withUserContext = jest.fn(async (_id, callback) =>
      callback({ query }),
    );
    const db = { withUserContext } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    const cuenta = await repository.obtenerCuentaActual('usuario-uuid');

    expect(withUserContext).toHaveBeenCalledWith(
      'usuario-uuid',
      expect.any(Function),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('select id, correo, estado_cuenta'),
      ['usuario-uuid'],
    );
    expect(query.mock.calls[0][0]).not.toContain('password_hash');
    expect(cuenta).toEqual({
      id: 'usuario-uuid',
      correo: 'persona@mail.com',
      estadoCuenta: 'activa',
    });
  });
});
