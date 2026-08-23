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

  it('registrar() manda altaPaciente=true por defecto si no se especifica', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'usuario-uuid' }] });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    await repository.registrar({
      correo: 'persona@mail.com',
      passwordHash: 'hash',
      tipoRegistro: TipoRegistro.PACIENTE,
    });

    expect(query).toHaveBeenCalledWith(
      'select app.registrar_usuario($1, $2, $3, $4) as id',
      ['persona@mail.com', 'hash', TipoRegistro.PACIENTE, true],
    );
  });

  it('registrar() propaga altaPaciente en false explícito', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'usuario-uuid' }] });
    const db = {
      withAppRole: jest.fn(async (callback) => callback({ query })),
    } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    await repository.registrar({
      correo: 'domi@mail.com',
      passwordHash: 'hash',
      tipoRegistro: TipoRegistro.DOMICILIARIO,
      altaPaciente: false,
    });

    expect(query).toHaveBeenCalledWith(
      'select app.registrar_usuario($1, $2, $3, $4) as id',
      ['domi@mail.com', 'hash', TipoRegistro.DOMICILIARIO, false],
    );
  });

  it('solicitarRolPaciente() consulta con withUserContext', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ solicitar_rol_paciente: 'agregado' }],
    });
    const withUserContext = jest.fn(async (_id, callback) => callback({ query }));
    const db = { withUserContext } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    const resultado = await repository.solicitarRolPaciente('usuario-uuid');

    expect(withUserContext).toHaveBeenCalledWith(
      'usuario-uuid',
      expect.any(Function),
    );
    expect(query).toHaveBeenCalledWith(
      'select app.solicitar_rol_paciente($1) as solicitar_rol_paciente',
      ['usuario-uuid'],
    );
    expect(resultado).toBe('agregado');
  });

  it('solicitarRolDomiciliario() consulta con withUserContext', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ solicitar_rol_domiciliario: 'ya_lo_tenia' }],
    });
    const withUserContext = jest.fn(async (_id, callback) => callback({ query }));
    const db = { withUserContext } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    const resultado = await repository.solicitarRolDomiciliario('usuario-uuid');

    expect(withUserContext).toHaveBeenCalledWith(
      'usuario-uuid',
      expect.any(Function),
    );
    expect(query).toHaveBeenCalledWith(
      'select app.solicitar_rol_domiciliario($1) as solicitar_rol_domiciliario',
      ['usuario-uuid'],
    );
    expect(resultado).toBe('ya_lo_tenia');
  });

  it('enviarSolicitudDomiciliario() mapea faltantes con withUserContext', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{ resultado: 'incompleta', faltantes: ['Cédula'] }],
    });
    const withUserContext = jest.fn(async (_id, callback) => callback({ query }));
    const db = { withUserContext } as unknown as DatabaseService;

    const repository = new PostgresUsuarioRepository(db);
    const resultado = await repository.enviarSolicitudDomiciliario('usuario-uuid');

    expect(withUserContext).toHaveBeenCalledWith(
      'usuario-uuid',
      expect.any(Function),
    );
    expect(query).toHaveBeenCalledWith(
      'select * from app.enviar_solicitud_domiciliario($1)',
      ['usuario-uuid'],
    );
    expect(resultado).toEqual({ resultado: 'incompleta', faltantes: ['Cédula'] });
  });
});
