import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import { ListarAdministradoresUseCase } from './listar-administradores.use-case';

describe('ListarAdministradoresUseCase', () => {
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerCuentaActual: jest.fn(),
    obtenerRoles: jest.fn(),
    solicitarRolPaciente: jest.fn(),
    solicitarRolDomiciliario: jest.fn(),
    enviarSolicitudDomiciliario: jest.fn(),
    crearAdministrador: jest.fn(),
    listarAdministradores: jest.fn(),
    obtenerAdministrador: jest.fn(),
  };
  const useCase = new ListarAdministradoresUseCase(usuarios);

  beforeEach(() => jest.resetAllMocks());

  it('delega en el repositorio y devuelve la lista tal cual', async () => {
    const administradores = [
      {
        id: 'admin-uuid',
        correo: 'admin@mail.com',
        nombreCompleto: 'Ana Admin',
        telefono: '3001234567',
        estadoCuenta: 'activa' as const,
        creadoEn: '2026-08-20T10:00:00.000Z',
      },
    ];
    (usuarios.listarAdministradores as jest.Mock).mockResolvedValue(administradores);

    const resultado = await useCase.execute('admin-uuid');

    expect(usuarios.listarAdministradores).toHaveBeenCalledWith('admin-uuid');
    expect(resultado).toBe(administradores);
  });
});
