import { AccionCuentaNoAutorizadaError } from '../../domain/errors/accion-cuenta-no-autorizada.error';
import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  DesbloquearCuentaUseCase,
  MENSAJE_CUENTA_DESBLOQUEADA,
  MENSAJE_CUENTA_NO_ESTABA_BLOQUEADA,
} from './desbloquear-cuenta.use-case';

describe('DesbloquearCuentaUseCase', () => {
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
  const useCase = new DesbloquearCuentaUseCase(usuarios);

  beforeEach(() => jest.resetAllMocks());

  it('desbloquea y devuelve el mensaje de éxito', async () => {
    (usuarios.desbloquearCuenta as jest.Mock).mockResolvedValue('desbloqueada');

    const resultado = await useCase.execute('admin-uuid', 'usuario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_CUENTA_DESBLOQUEADA });
  });

  it('devuelve mensaje idempotente si no estaba bloqueada', async () => {
    (usuarios.desbloquearCuenta as jest.Mock).mockResolvedValue(
      'ya_en_ese_estado',
    );

    const resultado = await useCase.execute('admin-uuid', 'usuario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_CUENTA_NO_ESTABA_BLOQUEADA });
  });

  it('lanza CuentaNoEncontradaError si no existe', async () => {
    (usuarios.desbloquearCuenta as jest.Mock).mockResolvedValue(
      'no_encontrado',
    );

    await expect(
      useCase.execute('admin-uuid', 'usuario-uuid'),
    ).rejects.toBeInstanceOf(CuentaNoEncontradaError);
  });

  it('lanza AccionCuentaNoAutorizadaError si no puede actuar sobre esa cuenta', async () => {
    (usuarios.desbloquearCuenta as jest.Mock).mockResolvedValue(
      'no_autorizado',
    );

    await expect(
      useCase.execute('admin-uuid', 'otro-admin-uuid'),
    ).rejects.toBeInstanceOf(AccionCuentaNoAutorizadaError);
  });
});
