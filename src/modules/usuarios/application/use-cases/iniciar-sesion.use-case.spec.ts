import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RefreshTokenPort } from '../../domain/ports/refresh-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';
import {
  CredencialesLogin,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';
import {
  DUMMY_PASSWORD_HASH,
  IniciarSesionUseCase,
} from './iniciar-sesion.use-case';

const credencialesActivas: CredencialesLogin = {
  usuarioId: 'usuario-uuid',
  correo: 'persona@mail.com',
  passwordHash: 'hash-real',
  estadoCuenta: 'activa',
};

describe('IniciarSesionUseCase', () => {
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerCuentaActual: jest.fn(),
    obtenerRoles: jest.fn(),
    solicitarRolPaciente: jest.fn(),
    solicitarRolDomiciliario: jest.fn(),
    enviarSolicitudDomiciliario: jest.fn(),
    crearAdministrador: jest.fn(),
  };
  const refreshTokens: RefreshTokenPort = {
    generar: jest.fn(),
    hash: jest.fn(),
  };
  const sesiones: SesionRepositoryPort = {
    crear: jest.fn(),
    rotar: jest.fn(),
    validar: jest.fn(),
    revocar: jest.fn(),
  };
  const accessTokens: AccessTokenPort = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const useCase = new IniciarSesionUseCase(
    passwordHasher,
    usuarios,
    refreshTokens,
    sesiones,
    accessTokens,
  );

  const expiraEn = new Date('2026-08-29T00:00:00.000Z');

  beforeEach(() => {
    jest.resetAllMocks();
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue(
      credencialesActivas,
    );
    (passwordHasher.compare as jest.Mock).mockResolvedValue(true);
    (refreshTokens.generar as jest.Mock).mockReturnValue({
      token: 'refresh-opaco',
      hash: 'refresh-hash',
      expiraEn,
    });
    (sesiones.crear as jest.Mock).mockResolvedValue('sid-uuid');
    (accessTokens.sign as jest.Mock).mockResolvedValue('access-jwt');
    (usuarios.obtenerRoles as jest.Mock).mockResolvedValue([
      { codigo: 'PACIENTE', estado: 'habilitado' },
      { codigo: 'DOMICILIARIO', estado: 'pendiente_validacion' },
    ]);
  });

  it('inicia sesión, crea sesión y retorna tokens + usuario con roles', async () => {
    const resultado = await useCase.execute({
      correo: '  PERSONA@Mail.COM  ',
      password: 'ClaveSegura1!',
      userAgent: 'MediRuta/1.0',
      ip: '127.0.0.1',
    });

    expect(usuarios.obtenerCredencialesLogin).toHaveBeenCalledWith(
      'persona@mail.com',
    );
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'ClaveSegura1!',
      'hash-real',
    );
    expect(refreshTokens.generar).toHaveBeenCalled();
    expect(sesiones.crear).toHaveBeenCalledWith({
      usuarioId: 'usuario-uuid',
      refreshTokenHash: 'refresh-hash',
      expiraEn,
      userAgent: 'MediRuta/1.0',
      ip: '127.0.0.1',
    });
    expect(accessTokens.sign).toHaveBeenCalledWith({
      sub: 'usuario-uuid',
      sid: 'sid-uuid',
    });
    expect(usuarios.obtenerRoles).toHaveBeenCalledWith('usuario-uuid');
    expect(resultado).toEqual({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-opaco',
      usuario: {
        id: 'usuario-uuid',
        correo: 'persona@mail.com',
        estadoCuenta: 'activa',
        roles: [
          { codigo: 'PACIENTE', estado: 'habilitado' },
          { codigo: 'DOMICILIARIO', estado: 'pendiente_validacion' },
        ],
      },
    });
  });

  it('si el correo no existe hace compare dummy y no crea sesión', async () => {
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        correo: 'nadie@mail.com',
        password: 'ClaveSegura1!',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'ClaveSegura1!',
      DUMMY_PASSWORD_HASH,
    );
    expect(sesiones.crear).not.toHaveBeenCalled();
    expect(refreshTokens.generar).not.toHaveBeenCalled();
    expect(accessTokens.sign).not.toHaveBeenCalled();
  });

  it('si el password es incorrecto no crea sesión y lanza el error genérico', async () => {
    (passwordHasher.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        correo: 'persona@mail.com',
        password: 'otraClave1!',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(sesiones.crear).not.toHaveBeenCalled();
  });

  it('si la cuenta está bloqueada no crea sesión aunque el password coincida', async () => {
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue({
      ...credencialesActivas,
      estadoCuenta: 'bloqueada',
    });

    await expect(
      useCase.execute({
        correo: 'persona@mail.com',
        password: 'ClaveSegura1!',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'ClaveSegura1!',
      'hash-real',
    );
    expect(sesiones.crear).not.toHaveBeenCalled();
  });

  it('si la cuenta está desactivada no crea sesión aunque el password coincida', async () => {
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue({
      ...credencialesActivas,
      estadoCuenta: 'desactivada',
    });

    await expect(
      useCase.execute({
        correo: 'persona@mail.com',
        password: 'ClaveSegura1!',
      }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(sesiones.crear).not.toHaveBeenCalled();
  });
});
