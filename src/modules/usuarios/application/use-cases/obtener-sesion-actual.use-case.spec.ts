import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import { ObtenerSesionActualUseCase } from './obtener-sesion-actual.use-case';

describe('ObtenerSesionActualUseCase', () => {
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
    listarCuentasAdmin: jest.fn(),
    obtenerCuentaAdmin: jest.fn(),
    bloquearCuenta: jest.fn(),
    desbloquearCuenta: jest.fn(),
  };
  const useCase = new ObtenerSesionActualUseCase(usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
    (usuarios.obtenerCuentaActual as jest.Mock).mockResolvedValue({
      id: 'usuario-uuid',
      correo: 'persona@mail.com',
      estadoCuenta: 'activa',
    });
    (usuarios.obtenerRoles as jest.Mock).mockResolvedValue([
      { codigo: 'PACIENTE', estado: 'habilitado' },
      { codigo: 'DOMICILIARIO', estado: 'pendiente_validacion' },
    ]);
  });

  it('devuelve la cuenta activa y los roles actuales del repositorio', async () => {
    const resultado = await useCase.execute('usuario-uuid');

    expect(usuarios.obtenerCuentaActual).toHaveBeenCalledWith('usuario-uuid');
    expect(usuarios.obtenerRoles).toHaveBeenCalledWith('usuario-uuid');
    expect(resultado).toEqual({
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
    expect(resultado).not.toHaveProperty('passwordHash');
    expect(resultado.usuario).not.toHaveProperty('sid');
  });

  it('trata una cuenta inexistente o no disponible como no autorizado', async () => {
    (usuarios.obtenerCuentaActual as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('usuario-uuid')).rejects.toMatchObject({
      name: 'NoAutorizadoError',
      message: 'No autorizado.',
    });
    expect(usuarios.obtenerRoles).not.toHaveBeenCalled();
  });

  it('no expone una cuenta bloqueada', async () => {
    (usuarios.obtenerCuentaActual as jest.Mock).mockResolvedValue({
      id: 'usuario-uuid',
      correo: 'persona@mail.com',
      estadoCuenta: 'bloqueada',
    });

    await expect(useCase.execute('usuario-uuid')).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });
});
