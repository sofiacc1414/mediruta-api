import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarSolicitudesUseCase } from './listar-solicitudes.use-case';

describe('ListarSolicitudesUseCase', () => {
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
obtenerDatosGeocodificacionFarmacia: jest.fn(),    obtenerNovedadAbierta: jest.fn(),    listarPedidosDisponibles: jest.fn(),    aceptarPedido: jest.fn(),    marcarMedicamentosRecogidos: jest.fn(),    iniciarEntrega: jest.fn(),    marcarEnSitio: jest.fn(),    entregarPedido: jest.fn(),    reportarNovedad: jest.fn(),    listarNovedadesAbiertas: jest.fn(),    resolverNovedad: jest.fn(),
  };
  const useCase = new ListarSolicitudesUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G02 — devuelve la lista que resuelve el repositorio', async () => {
    const lista = [
      {
        id: 'solicitud-uuid',
        codigoPedido: null,
        estado: 'borrador' as const,
        creadoEn: '2026-08-20T10:00:00.000Z',
      },
    ];
    (solicitudes.listar as jest.Mock).mockResolvedValue(lista);

    const resultado = await useCase.execute('paciente-uuid');

    expect(resultado).toBe(lista);
    expect(solicitudes.listar).toHaveBeenCalledWith('paciente-uuid');
  });
});
