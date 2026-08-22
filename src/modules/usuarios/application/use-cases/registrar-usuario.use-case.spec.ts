import { TipoRegistroInvalidoError } from '../../domain/errors/tipo-registro-invalido.error';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import { TipoRegistro } from '../../domain/value-objects/tipo-registro';
import { RegistrarUsuarioUseCase } from './registrar-usuario.use-case';

describe('RegistrarUsuarioUseCase', () => {
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerRoles: jest.fn(),
  };

  const useCase = new RegistrarUsuarioUseCase(passwordHasher, usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
    (passwordHasher.hash as jest.Mock).mockResolvedValue('hash-bcrypt');
    (usuarios.registrar as jest.Mock).mockResolvedValue('usuario-uuid');
  });

  it('normaliza el correo, hashea la contraseña y registra un paciente', async () => {
    const resultado = await useCase.execute({
      correo: '  PERSONA@Mail.COM  ',
      password: 'ClaveSegura1!',
      tipoRegistro: TipoRegistro.PACIENTE,
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('ClaveSegura1!');
    expect(usuarios.registrar).toHaveBeenCalledWith({
      correo: 'persona@mail.com',
      passwordHash: 'hash-bcrypt',
      tipoRegistro: TipoRegistro.PACIENTE,
    });
    expect(usuarios.registrar).not.toHaveBeenCalledWith(
      expect.objectContaining({ password: 'ClaveSegura1!' }),
    );
    expect(resultado).toEqual({
      usuarioId: 'usuario-uuid',
      correo: 'persona@mail.com',
      tipoRegistro: TipoRegistro.PACIENTE,
      estadoCuenta: 'activa',
    });
    expect(resultado).not.toHaveProperty('estadoDomiciliario');
  });

  it('conserva el tipo DOMICILIARIO y marca pendiente_validacion', async () => {
    const resultado = await useCase.execute({
      correo: 'domi@mail.com',
      password: 'ClaveSegura1!',
      tipoRegistro: TipoRegistro.DOMICILIARIO,
    });

    expect(usuarios.registrar).toHaveBeenCalledWith({
      correo: 'domi@mail.com',
      passwordHash: 'hash-bcrypt',
      tipoRegistro: TipoRegistro.DOMICILIARIO,
    });
    expect(resultado.estadoDomiciliario).toBe('pendiente_validacion');
  });

  it('nunca envía la contraseña en texto plano al repositorio', async () => {
    await useCase.execute({
      correo: 'persona@mail.com',
      password: 'ClaveSegura1!',
      tipoRegistro: TipoRegistro.PACIENTE,
    });

    const input = (usuarios.registrar as jest.Mock).mock.calls[0][0];
    expect(input.passwordHash).toBe('hash-bcrypt');
    expect(input).not.toHaveProperty('password');
    expect(JSON.stringify(input)).not.toContain('ClaveSegura1!');
  });

  it('rechaza ADMINISTRADOR y ROOT', async () => {
    await expect(
      useCase.execute({
        correo: 'admin@mail.com',
        password: 'ClaveSegura1!',
        tipoRegistro: 'ADMINISTRADOR',
      }),
    ).rejects.toBeInstanceOf(TipoRegistroInvalidoError);

    await expect(
      useCase.execute({
        correo: 'root@mail.com',
        password: 'ClaveSegura1!',
        tipoRegistro: 'ROOT',
      }),
    ).rejects.toBeInstanceOf(TipoRegistroInvalidoError);

    expect(usuarios.registrar).not.toHaveBeenCalled();
  });
});
