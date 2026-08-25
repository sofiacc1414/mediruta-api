import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { MENSAJE_NOVEDAD_RESUELTA, ResolverNovedadUseCase } from './resolver-novedad.use-case';

describe('ResolverNovedadUseCase', () => {
  const solicitudes: SolicitudRepositoryPort = {
    crear: jest.fn(),
    listar: jest.fn(),
    obtener: jest.fn(),
    listarMedicamentos: jest.fn(),
    listarHistorial: jest.fn(),
    actualizar: jest.fn(),
    actualizarReceta: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
    obtenerDatosGeocodificacionFarmacia: jest.fn(),
    obtenerNovedadAbierta: jest.fn(),
    listarPedidosDisponibles: jest.fn(),
    aceptarPedido: jest.fn(),
    marcarMedicamentosRecogidos: jest.fn(),
    iniciarEntrega: jest.fn(),
    marcarEnSitio: jest.fn(),
    entregarPedido: jest.fn(),
    reportarNovedad: jest.fn(),
    listarNovedadesAbiertas: jest.fn(),
    resolverNovedad: jest.fn(),
  };
  const useCase = new ResolverNovedadUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G10 — resuelve y devuelve el mensaje de éxito', async () => {
    (solicitudes.resolverNovedad as jest.Mock).mockResolvedValue('resuelta');

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_NOVEDAD_RESUELTA });
    expect(solicitudes.resolverNovedad).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
    );
  });

  it('lanza NovedadNoEncontradaError si no existe o ya estaba resuelta', async () => {
    (solicitudes.resolverNovedad as jest.Mock).mockResolvedValue('no_encontrado');

    await expect(
      useCase.execute('admin-uuid', 'novedad-uuid'),
    ).rejects.toBeInstanceOf(NovedadNoEncontradaError);
  });
});
