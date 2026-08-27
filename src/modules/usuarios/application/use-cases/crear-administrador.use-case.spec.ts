import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import { CrearAdministradorUseCase } from './crear-administrador.use-case';

describe('CrearAdministradorUseCase', () => {
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

  const useCase = new CrearAdministradorUseCase(passwordHasher, usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
    (passwordHasher.hash as jest.Mock).mockResolvedValue('hash-bcrypt');
    (usuarios.crearAdministrador as jest.Mock).mockResolvedValue('admin-uuid');
  });

  it('normaliza el correo, hashea la contraseña y crea la cuenta', async () => {
    const resultado = await useCase.execute({
      correo: '  ADMIN@Mail.COM  ',
      password: 'ClaveSegura1!',
      nombreCompleto: '  Ana Admin  ',
      telefono: '  3001234567  ',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('ClaveSegura1!');
    expect(usuarios.crearAdministrador).toHaveBeenCalledWith({
      correo: 'admin@mail.com',
      passwordHash: 'hash-bcrypt',
      nombreCompleto: 'Ana Admin',
      telefono: '3001234567',
    });
    expect(resultado).toEqual({ usuarioId: 'admin-uuid', correo: 'admin@mail.com' });
  });

  it('nombreCompleto/telefono quedan undefined si no se mandan', async () => {
    await useCase.execute({ correo: 'admin@mail.com', password: 'ClaveSegura1!' });

    expect(usuarios.crearAdministrador).toHaveBeenCalledWith({
      correo: 'admin@mail.com',
      passwordHash: 'hash-bcrypt',
      nombreCompleto: undefined,
      telefono: undefined,
    });
  });

  it('propaga el error si el correo ya está registrado', async () => {
    const error = new Error('correo duplicado');
    (usuarios.crearAdministrador as jest.Mock).mockRejectedValue(error);

    await expect(
      useCase.execute({ correo: 'admin@mail.com', password: 'ClaveSegura1!' }),
    ).rejects.toBe(error);
  });
});
