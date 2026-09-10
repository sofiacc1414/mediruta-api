import { NivelCopagoNoEncontradoError } from '../../domain/errors/nivel-copago-no-encontrado.error';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  ActualizarNivelCopagoPacienteUseCase,
  MENSAJE_NIVEL_COPAGO_ACTUALIZADO,
} from './actualizar-nivel-copago-paciente.use-case';

describe('ActualizarNivelCopagoPacienteUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    actualizarFotoPerfil: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
    actualizarDisponibilidadDomiciliario: jest.fn(),
    listarNivelesCopago: jest.fn(),
    actualizarNivelCopagoPaciente: jest.fn(),
  };
  const useCase = new ActualizarNivelCopagoPacienteUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('devuelve el mensaje de éxito cuando se actualiza', async () => {
    (perfiles.actualizarNivelCopagoPaciente as jest.Mock).mockResolvedValue(
      'actualizado',
    );

    const resultado = await useCase.execute('paciente-uuid', 'nivel-uuid');

    expect(resultado).toEqual({ message: MENSAJE_NIVEL_COPAGO_ACTUALIZADO });
    expect(perfiles.actualizarNivelCopagoPaciente).toHaveBeenCalledWith(
      'paciente-uuid',
      'nivel-uuid',
    );
  });

  it('lanza NivelCopagoNoEncontradoError si el nivel no existe', async () => {
    (perfiles.actualizarNivelCopagoPaciente as jest.Mock).mockResolvedValue(
      'nivel_no_encontrado',
    );

    await expect(
      useCase.execute('paciente-uuid', 'nivel-uuid'),
    ).rejects.toThrow(NivelCopagoNoEncontradoError);
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene perfil de Paciente', async () => {
    (perfiles.actualizarNivelCopagoPaciente as jest.Mock).mockResolvedValue(
      'perfil_no_encontrado',
    );

    await expect(
      useCase.execute('paciente-uuid', 'nivel-uuid'),
    ).rejects.toThrow(RolNoAutorizadoError);
  });
});
