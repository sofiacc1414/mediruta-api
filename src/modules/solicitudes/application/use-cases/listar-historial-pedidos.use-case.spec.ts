import {
  PedidoHistorialDomiciliario,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { ListarHistorialPedidosUseCase } from './listar-historial-pedidos.use-case';

describe('ListarHistorialPedidosUseCase', () => {
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
    listarHistorialPedidos: jest.fn(),
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
    obtenerDocumentosPacienteParaRecoger: jest.fn(),
  };
  const useCase = new ListarHistorialPedidosUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('delega en el repositorio y devuelve la lista tal cual', async () => {
    const pedidos: PedidoHistorialDomiciliario[] = [
      {
        id: 'solicitud-1',
        codigoPedido: 'MR-000010',
        estado: 'entregado',
        direccionEntrega: 'Calle 1 #2-3',
        creadoEn: '2026-08-20T10:00:00.000Z',
      },
      {
        id: 'solicitud-2',
        codigoPedido: 'MR-000015',
        estado: 'en_camino_entrega',
        direccionEntrega: 'Calle 4 #5-6',
        creadoEn: '2026-08-22T10:00:00.000Z',
      },
    ];
    (solicitudes.listarHistorialPedidos as jest.Mock).mockResolvedValue(pedidos);

    const resultado = await useCase.execute('domiciliario-uuid');

    expect(resultado).toBe(pedidos);
    expect(solicitudes.listarHistorialPedidos).toHaveBeenCalledWith('domiciliario-uuid');
  });
});
