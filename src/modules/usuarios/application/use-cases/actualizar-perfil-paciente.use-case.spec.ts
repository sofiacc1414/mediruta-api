import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  ActualizarPerfilPacienteUseCase,
  MENSAJE_PERFIL_PACIENTE_ACTUALIZADO,
} from './actualizar-perfil-paciente.use-case';

describe('ActualizarPerfilPacienteUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    actualizarFotoPerfil: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
  };

  const useCase = new ActualizarPerfilPacienteUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01/G03 — actualiza dirección y fecha de nacimiento', async () => {
    (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute({
      usuarioId: 'usuario-uuid',
      direccion: 'Calle 123 #45-67',
      fechaNacimiento: '1990-05-10',
    });

    expect(perfiles.upsertPerfilPaciente).toHaveBeenCalledWith(
      'usuario-uuid',
      'Calle 123 #45-67',
      '1990-05-10',
    );
    expect(resultado).toEqual({ message: MENSAJE_PERFIL_PACIENTE_ACTUALIZADO });
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol PACIENTE', async () => {
    (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        direccion: 'Calle 123 #45-67',
        fechaNacimiento: '1990-05-10',
      }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
