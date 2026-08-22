import { CambioContrasenaInvalidoError } from '../../domain/errors/cambio-contrasena-invalido.error';
import { NuevaContrasenaIgualError } from '../../domain/errors/nueva-contrasena-igual.error';
import { CambioContrasenaRepositoryPort } from '../../domain/ports/cambio-contrasena.repository.port';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import {
  CambiarContrasenaUseCase,
  MENSAJE_CONTRASENA_CAMBIADA,
} from './cambiar-contrasena.use-case';

const comandoValido = {
  usuarioId: 'usuario-uuid',
  sid: 'sid-uuid',
  passwordActual: 'ClaveActual1!',
  nuevaPassword: 'ClaveNueva1!',
};

describe('CambiarContrasenaUseCase', () => {
  const passwordHasher: PasswordHasherPort = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const cambios: CambioContrasenaRepositoryPort = {
    obtenerPasswordHash: jest.fn(),
    cambiar: jest.fn(),
  };

  const useCase = new CambiarContrasenaUseCase(passwordHasher, cambios);

  beforeEach(() => {
    jest.resetAllMocks();
    (cambios.obtenerPasswordHash as jest.Mock).mockResolvedValue('hash-actual');
    (passwordHasher.compare as jest.Mock).mockResolvedValue(true);
    (passwordHasher.hash as jest.Mock).mockResolvedValue('hash-nuevo');
    (cambios.cambiar as jest.Mock).mockResolvedValue(true);
  });

  it('obtiene el hash con usuarioId + sid y cambia con hashes, no con la contraseña en claro', async () => {
    const resultado = await useCase.execute(comandoValido);

    expect(cambios.obtenerPasswordHash).toHaveBeenCalledWith(
      'usuario-uuid',
      'sid-uuid',
    );
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'ClaveActual1!',
      'hash-actual',
    );
    expect(passwordHasher.hash).toHaveBeenCalledWith('ClaveNueva1!');
    expect(cambios.cambiar).toHaveBeenCalledWith(
      'usuario-uuid',
      'sid-uuid',
      'hash-actual',
      'hash-nuevo',
    );
    expect(cambios.cambiar).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'ClaveActual1!',
      expect.anything(),
    );
    expect(resultado).toEqual({ message: MENSAJE_CONTRASENA_CAMBIADA });
    expect(resultado).not.toHaveProperty('passwordHash');
    expect(resultado).not.toHaveProperty('accessToken');
  });

  it('si la contraseña actual no coincide no hashea ni cambia', async () => {
    (passwordHasher.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(comandoValido)).rejects.toBeInstanceOf(
      CambioContrasenaInvalidoError,
    );
    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(cambios.cambiar).not.toHaveBeenCalled();
  });

  it('si no hay hash lanza el error genérico', async () => {
    (cambios.obtenerPasswordHash as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(comandoValido)).rejects.toBeInstanceOf(
      CambioContrasenaInvalidoError,
    );
    expect(passwordHasher.compare).not.toHaveBeenCalled();
    expect(cambios.cambiar).not.toHaveBeenCalled();
  });

  it('si el repositorio retorna false lanza el error genérico', async () => {
    (cambios.cambiar as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(comandoValido)).rejects.toBeInstanceOf(
      CambioContrasenaInvalidoError,
    );
    await expect(useCase.execute(comandoValido)).rejects.toThrow(
      'No fue posible cambiar la contraseña con las credenciales proporcionadas.',
    );
  });

  it('si el repositorio retorna true responde éxito', async () => {
    await expect(useCase.execute(comandoValido)).resolves.toEqual({
      message: MENSAJE_CONTRASENA_CAMBIADA,
    });
  });

  it('si la nueva contraseña es igual a la actual no llama cambiar', async () => {
    await expect(
      useCase.execute({
        ...comandoValido,
        nuevaPassword: 'ClaveActual1!',
      }),
    ).rejects.toBeInstanceOf(NuevaContrasenaIgualError);

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(cambios.cambiar).not.toHaveBeenCalled();
  });
});
