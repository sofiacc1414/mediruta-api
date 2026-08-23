import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  ActualizarDatosComunesUseCase,
  MENSAJE_DATOS_COMUNES_ACTUALIZADOS,
} from './actualizar-datos-comunes.use-case';

describe('ActualizarDatosComunesUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
  };

  const useCase = new ActualizarDatosComunesUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G03 — actualiza nombre y teléfono', async () => {
    (perfiles.actualizarDatosComunes as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute({
      usuarioId: 'usuario-uuid',
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
    });

    expect(perfiles.actualizarDatosComunes).toHaveBeenCalledWith(
      'usuario-uuid',
      'Persona de Prueba',
      '3001234567',
    );
    expect(resultado).toEqual({ message: MENSAJE_DATOS_COMUNES_ACTUALIZADOS });
  });

  it('lanza NoAutorizadoError si la cuenta no está activa', async () => {
    (perfiles.actualizarDatosComunes as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        nombreCompleto: 'Persona de Prueba',
        telefono: '3001234567',
      }),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
  });
});
