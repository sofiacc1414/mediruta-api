import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarPedidosDisponiblesUseCase } from './listar-pedidos-disponibles.use-case';

describe('ListarPedidosDisponiblesUseCase', () => {
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
    listarPedidosAdmin: jest.fn(),
  };
  const useCase = new ListarPedidosDisponiblesUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G01 — delega en el repositorio y devuelve la lista tal cual', async () => {
    const pool = [
      {
        id: 'solicitud-uuid',
        codigoPedido: 'MR-000123',
        direccionFarmacia: 'Farmacia La Rebaja',
        direccionEntrega: 'Calle 1 #2-3',
        distanciaMetros: 1800,
        creadoEn: '2026-08-24T10:00:00.000Z',
      },
    ];
    (solicitudes.listarPedidosDisponibles as jest.Mock).mockResolvedValue(pool);

    const resultado = await useCase.execute('domiciliario-uuid');

    expect(solicitudes.listarPedidosDisponibles).toHaveBeenCalledWith(
      'domiciliario-uuid',
    );
    expect(resultado).toBe(pool);
  });
});
