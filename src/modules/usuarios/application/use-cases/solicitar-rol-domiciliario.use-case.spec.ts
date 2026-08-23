import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  MENSAJE_ROL_DOMICILIARIO_AGREGADO,
  MENSAJE_ROL_DOMICILIARIO_YA_LO_TENIA,
  SolicitarRolDomiciliarioUseCase,
} from './solicitar-rol-domiciliario.use-case';

describe('SolicitarRolDomiciliarioUseCase', () => {
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerCuentaActual: jest.fn(),
    obtenerRoles: jest.fn(),
    solicitarRolPaciente: jest.fn(),
    solicitarRolDomiciliario: jest.fn(),
  };
  const useCase = new SolicitarRolDomiciliarioUseCase(usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('agrega el rol (pendiente_validacion) y devuelve el mensaje de éxito', async () => {
    (usuarios.solicitarRolDomiciliario as jest.Mock).mockResolvedValue(
      'agregado',
    );

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_ROL_DOMICILIARIO_AGREGADO });
    expect(usuarios.solicitarRolDomiciliario).toHaveBeenCalledWith(
      'usuario-uuid',
    );
  });

  it('es idempotente: si ya lo tenía, no es un error', async () => {
    (usuarios.solicitarRolDomiciliario as jest.Mock).mockResolvedValue(
      'ya_lo_tenia',
    );

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual({
      message: MENSAJE_ROL_DOMICILIARIO_YA_LO_TENIA,
    });
  });
});
