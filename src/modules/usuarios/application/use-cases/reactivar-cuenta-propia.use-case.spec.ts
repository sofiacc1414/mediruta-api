import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import {
  CredencialesLogin,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';
import { DUMMY_PASSWORD_HASH, IniciarSesionUseCase } from './iniciar-sesion.use-case';
import { ReactivarCuentaPropiaUseCase } from './reactivar-cuenta-propia.use-case';

const credencialesDesactivada: CredencialesLogin = {
  usuarioId: 'usuario-uuid',
  correo: 'persona@mail.com',
  passwordHash: 'hash-real',
  estadoCuenta: 'desactivada',
};

describe('ReactivarCuentaPropiaUseCase', () => {
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const usuarios: Pick<
    UsuarioRepositoryPort,
    'obtenerCredencialesLogin' | 'reactivarCuentaPropia'
  > = {
    obtenerCredencialesLogin: jest.fn(),
    reactivarCuentaPropia: jest.fn(),
  };
  const iniciarSesion = {
    execute: jest.fn(),
  } as unknown as IniciarSesionUseCase;

  const useCase = new ReactivarCuentaPropiaUseCase(
    passwordHasher,
    usuarios as UsuarioRepositoryPort,
    iniciarSesion,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue(
      credencialesDesactivada,
    );
    (passwordHasher.compare as jest.Mock).mockResolvedValue(true);
    (usuarios.reactivarCuentaPropia as jest.Mock).mockResolvedValue(true);
    (iniciarSesion.execute as jest.Mock).mockResolvedValue({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-opaco',
      usuario: { id: 'usuario-uuid', correo: 'persona@mail.com', estadoCuenta: 'activa', roles: [] },
    });
  });

  it('reactiva la cuenta y delega en IniciarSesionUseCase para emitir tokens', async () => {
    const resultado = await useCase.execute({
      correo: '  PERSONA@Mail.COM  ',
      password: 'ClaveSegura1!',
      userAgent: 'MediRuta/1.0',
      ip: '127.0.0.1',
    });

    expect(usuarios.obtenerCredencialesLogin).toHaveBeenCalledWith(
      'persona@mail.com',
    );
    expect(usuarios.reactivarCuentaPropia).toHaveBeenCalledWith('usuario-uuid');
    expect(iniciarSesion.execute).toHaveBeenCalledWith({
      correo: '  PERSONA@Mail.COM  ',
      password: 'ClaveSegura1!',
      userAgent: 'MediRuta/1.0',
      ip: '127.0.0.1',
    });
    expect(resultado.accessToken).toBe('access-jwt');
  });

  it('si el correo no existe hace compare dummy y no reactiva nada', async () => {
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ correo: 'nadie@mail.com', password: 'ClaveSegura1!' }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'ClaveSegura1!',
      DUMMY_PASSWORD_HASH,
    );
    expect(usuarios.reactivarCuentaPropia).not.toHaveBeenCalled();
  });

  it('si el password es incorrecto no reactiva y lanza el error genérico', async () => {
    (passwordHasher.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ correo: 'persona@mail.com', password: 'otraClave1!' }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(usuarios.reactivarCuentaPropia).not.toHaveBeenCalled();
  });

  it('si la cuenta ya no está desactivada (ya activa/bloqueada), lanza el error genérico', async () => {
    (usuarios.obtenerCredencialesLogin as jest.Mock).mockResolvedValue({
      ...credencialesDesactivada,
      estadoCuenta: 'activa',
    });

    await expect(
      useCase.execute({ correo: 'persona@mail.com', password: 'ClaveSegura1!' }),
    ).rejects.toBeInstanceOf(CredencialesInvalidasError);

    expect(usuarios.reactivarCuentaPropia).not.toHaveBeenCalled();
  });
});
