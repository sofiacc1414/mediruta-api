import { RecuperacionInvalidaError } from '../../domain/errors/recuperacion-invalida.error';
import { CodigoRecuperacionPort } from '../../domain/ports/codigo-recuperacion.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { RecuperacionContrasenaRepositoryPort } from '../../domain/ports/recuperacion-contrasena.repository.port';
import {
  MENSAJE_CONTRASENA_RESTABLECIDA,
  RestablecerContrasenaUseCase,
} from './restablecer-contrasena.use-case';

describe('RestablecerContrasenaUseCase', () => {
  const codigos: CodigoRecuperacionPort = {
    generarCodigo: jest.fn(),
    hashCodigo: jest.fn(),
  };
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const recuperaciones: RecuperacionContrasenaRepositoryPort = {
    crear: jest.fn(),
    restablecer: jest.fn(),
  };

  const useCase = new RestablecerContrasenaUseCase(
    codigos,
    passwordHasher,
    recuperaciones,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (codigos.hashCodigo as jest.Mock).mockReturnValue('hmac-del-otp');
    (passwordHasher.hash as jest.Mock).mockResolvedValue('hash-bcrypt');
    (recuperaciones.restablecer as jest.Mock).mockResolvedValue(true);
  });

  it('hashea el código y la nueva contraseña y llama al repositorio sin valores en claro', async () => {
    const resultado = await useCase.execute({
      correo: '  PERSONA@Mail.COM  ',
      codigo: '000123',
      nuevaPassword: 'ClaveNueva1!',
    });

    expect(codigos.hashCodigo).toHaveBeenCalledWith('000123');
    expect(passwordHasher.hash).toHaveBeenCalledWith('ClaveNueva1!');
    expect(recuperaciones.restablecer).toHaveBeenCalledWith({
      correo: 'persona@mail.com',
      codigoHash: 'hmac-del-otp',
      nuevoPasswordHash: 'hash-bcrypt',
    });
    expect(recuperaciones.restablecer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: '000123',
        nuevaPassword: 'ClaveNueva1!',
      }),
    );
    expect(resultado).toEqual({ message: MENSAJE_CONTRASENA_RESTABLECIDA });
  });

  it('si el repositorio retorna false lanza el error genérico', async () => {
    (recuperaciones.restablecer as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        correo: 'persona@mail.com',
        codigo: '000123',
        nuevaPassword: 'ClaveNueva1!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);

    await expect(
      useCase.execute({
        correo: 'persona@mail.com',
        codigo: '000123',
        nuevaPassword: 'ClaveNueva1!',
      }),
    ).rejects.toThrow(
      'El código de recuperación no es válido o ya no está disponible.',
    );
  });
});
