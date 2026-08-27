import { AccionCuentaNoAutorizadaError } from '../../domain/errors/accion-cuenta-no-autorizada.error';
import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  BloquearCuentaUseCase,
  MENSAJE_CUENTA_BLOQUEADA,
  MENSAJE_CUENTA_YA_BLOQUEADA,
} from './bloquear-cuenta.use-case';

describe('BloquearCuentaUseCase', () => {
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
  const useCase = new BloquearCuentaUseCase(usuarios);

  beforeEach(() => jest.resetAllMocks());

  it('bloquea y devuelve el mensaje de éxito', async () => {
    (usuarios.bloquearCuenta as jest.Mock).mockResolvedValue('bloqueada');

    const resultado = await useCase.execute(
      'admin-uuid',
      'usuario-uuid',
      'Reportes falsos',
    );

    expect(resultado).toEqual({ message: MENSAJE_CUENTA_BLOQUEADA });
    expect(usuarios.bloquearCuenta).toHaveBeenCalledWith(
      'admin-uuid',
      'usuario-uuid',
      'Reportes falsos',
    );
  });

  it('devuelve mensaje idempotente si ya estaba bloqueada', async () => {
    (usuarios.bloquearCuenta as jest.Mock).mockResolvedValue(
      'ya_en_ese_estado',
    );

    const resultado = await useCase.execute(
      'admin-uuid',
      'usuario-uuid',
      'motivo',
    );

    expect(resultado).toEqual({ message: MENSAJE_CUENTA_YA_BLOQUEADA });
  });

  it('lanza CuentaNoEncontradaError si no existe', async () => {
    (usuarios.bloquearCuenta as jest.Mock).mockResolvedValue('no_encontrado');

    await expect(
      useCase.execute('admin-uuid', 'usuario-uuid', 'motivo'),
    ).rejects.toBeInstanceOf(CuentaNoEncontradaError);
  });

  it('lanza AccionCuentaNoAutorizadaError si un Administrador intenta bloquear a otro admin', async () => {
    (usuarios.bloquearCuenta as jest.Mock).mockResolvedValue('no_autorizado');

    await expect(
      useCase.execute('admin-uuid', 'otro-admin-uuid', 'motivo'),
    ).rejects.toBeInstanceOf(AccionCuentaNoAutorizadaError);
  });
});
