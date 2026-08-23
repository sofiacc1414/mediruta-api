import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  MENSAJE_ROL_PACIENTE_AGREGADO,
  MENSAJE_ROL_PACIENTE_YA_LO_TENIA,
  SolicitarRolPacienteUseCase,
} from './solicitar-rol-paciente.use-case';

describe('SolicitarRolPacienteUseCase', () => {
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerCuentaActual: jest.fn(),
    obtenerRoles: jest.fn(),
    solicitarRolPaciente: jest.fn(),
    solicitarRolDomiciliario: jest.fn(),
  };
  const useCase = new SolicitarRolPacienteUseCase(usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('agrega el rol y devuelve el mensaje de éxito', async () => {
    (usuarios.solicitarRolPaciente as jest.Mock).mockResolvedValue('agregado');

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_ROL_PACIENTE_AGREGADO });
    expect(usuarios.solicitarRolPaciente).toHaveBeenCalledWith('usuario-uuid');
  });

  it('es idempotente: si ya lo tenía, no es un error', async () => {
    (usuarios.solicitarRolPaciente as jest.Mock).mockResolvedValue(
      'ya_lo_tenia',
    );

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_ROL_PACIENTE_YA_LO_TENIA });
  });
});
