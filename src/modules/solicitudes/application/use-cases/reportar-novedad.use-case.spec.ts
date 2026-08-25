import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { MENSAJE_NOVEDAD_REPORTADA, ReportarNovedadUseCase } from './reportar-novedad.use-case';

describe('ReportarNovedadUseCase', () => {
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
    obtenerPedidoActivo: jest.fn(),
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
  };
  const useCase = new ReportarNovedadUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G08 — reporta y devuelve el mensaje de éxito con el id de la novedad', async () => {
    (solicitudes.reportarNovedad as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
    });

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
      'No había uno de los medicamentos',
    );

    expect(resultado).toEqual({
      message: MENSAJE_NOVEDAD_REPORTADA,
      id: 'novedad-uuid',
    });
    expect(solicitudes.reportarNovedad).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
      'No había uno de los medicamentos',
    );
  });

  it('lanza SolicitudNoEncontradaError si no es del dueño o ya está entregado/cancelado', async () => {
    (solicitudes.reportarNovedad as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid', 'detalle'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
