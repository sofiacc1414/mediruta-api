import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  ActualizarPerfilDomiciliarioUseCase,
  MENSAJE_PERFIL_DOMICILIARIO_ACTUALIZADO,
} from './actualizar-perfil-domiciliario.use-case';

describe('ActualizarPerfilDomiciliarioUseCase', () => {
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

  const useCase = new ActualizarPerfilDomiciliarioUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01/G03 — actualiza dirección y vehículo', async () => {
    (perfiles.upsertPerfilDomiciliario as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute({
      usuarioId: 'usuario-uuid',
      direccion: 'Calle 123 #45-67',
      vehiculoTipo: 'Moto',
      vehiculoPlaca: 'ABC123',
    });

    expect(perfiles.upsertPerfilDomiciliario).toHaveBeenCalledWith(
      'usuario-uuid',
      'Calle 123 #45-67',
      'Moto',
      'ABC123',
    );
    expect(resultado).toEqual({
      message: MENSAJE_PERFIL_DOMICILIARIO_ACTUALIZADO,
    });
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol DOMICILIARIO', async () => {
    (perfiles.upsertPerfilDomiciliario as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        direccion: 'Calle 123 #45-67',
        vehiculoTipo: 'Moto',
        vehiculoPlaca: 'ABC123',
      }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
