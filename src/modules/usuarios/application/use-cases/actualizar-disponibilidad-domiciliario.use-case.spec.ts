import { NoPuedeDesconectarseConPedidoActivoError } from '../../domain/errors/no-puede-desconectarse-con-pedido-activo.error';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  ActualizarDisponibilidadDomiciliarioUseCase,
  MENSAJE_DISPONIBILIDAD_ACTUALIZADA,
} from './actualizar-disponibilidad-domiciliario.use-case';

describe('ActualizarDisponibilidadDomiciliarioUseCase', () => {
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
  };
  const useCase = new ActualizarDisponibilidadDomiciliarioUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('activa disponibilidad con ubicación y delega tal cual', async () => {
    (
      perfiles.actualizarDisponibilidadDomiciliario as jest.Mock
    ).mockResolvedValue('actualizado');

    const resultado = await useCase.execute({
      usuarioId: 'domiciliario-uuid',
      disponible: true,
      lat: 4.65,
      lng: -74.06,
    });

    expect(resultado).toEqual({ message: MENSAJE_DISPONIBILIDAD_ACTUALIZADA });
    expect(perfiles.actualizarDisponibilidadDomiciliario).toHaveBeenCalledWith(
      'domiciliario-uuid',
      true,
      4.65,
      -74.06,
    );
  });

  it('desactiva sin necesitar ubicación', async () => {
    (
      perfiles.actualizarDisponibilidadDomiciliario as jest.Mock
    ).mockResolvedValue('actualizado');

    await useCase.execute({
      usuarioId: 'domiciliario-uuid',
      disponible: false,
      lat: null,
      lng: null,
    });

    expect(perfiles.actualizarDisponibilidadDomiciliario).toHaveBeenCalledWith(
      'domiciliario-uuid',
      false,
      null,
      null,
    );
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene DOMICILIARIO habilitado', async () => {
    (
      perfiles.actualizarDisponibilidadDomiciliario as jest.Mock
    ).mockResolvedValue('no_autorizado');

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        disponible: true,
        lat: 4.65,
        lng: -74.06,
      }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('lanza NoPuedeDesconectarseConPedidoActivoError si intenta desactivar con un pedido en curso', async () => {
    (
      perfiles.actualizarDisponibilidadDomiciliario as jest.Mock
    ).mockResolvedValue('tiene_pedido_activo');

    await expect(
      useCase.execute({
        usuarioId: 'domiciliario-uuid',
        disponible: false,
        lat: null,
        lng: null,
      }),
    ).rejects.toBeInstanceOf(NoPuedeDesconectarseConPedidoActivoError);
  });
});
