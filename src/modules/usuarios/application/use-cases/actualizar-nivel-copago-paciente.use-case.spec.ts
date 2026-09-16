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

  it('elige el nivel aunque el perfil todavía no exista — la SQL hace upsert (regresión: antes fallaba con "no tiene rol")', async () => {
    // Ya no hay un caso "perfil_no_encontrado": `actualizar_nivel_copago_perfil`
    // ahora crea la fila de `perfil_paciente` si hace falta (ver migración
    // 20260915010000). Este test documenta ese contrato desde el use case:
    // 'actualizado' es el único resultado posible cuando la cuenta sí tiene
    // el rol PACIENTE, exista o no el perfil todavía.
    (perfiles.actualizarNivelCopagoPaciente as jest.Mock).mockResolvedValue(
      'actualizado',
    );

    const resultado = await useCase.execute('paciente-uuid', 'nivel-uuid');

    expect(resultado).toEqual({ message: MENSAJE_NIVEL_COPAGO_ACTUALIZADO });
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene el rol PACIENTE', async () => {
    (perfiles.actualizarNivelCopagoPaciente as jest.Mock).mockResolvedValue(
      'no_autorizado',
    );

    await expect(
      useCase.execute('paciente-uuid', 'nivel-uuid'),
    ).rejects.toThrow(RolNoAutorizadoError);
  });
});
