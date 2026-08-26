import {
  PedidoActivoDomiciliario,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { ObtenerPedidoActivoUseCase } from './obtener-pedido-activo.use-case';

describe('ObtenerPedidoActivoUseCase', () => {
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
  };
  const useCase = new ObtenerPedidoActivoUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('devuelve null si el Domiciliario no tiene ningún pedido activo', async () => {
    (solicitudes.obtenerPedidoActivo as jest.Mock).mockResolvedValue(null);

    const resultado = await useCase.execute('domiciliario-uuid');

    expect(resultado).toBeNull();
    expect(solicitudes.listarHistorialPedidoActivo).not.toHaveBeenCalled();
    expect(solicitudes.obtenerNovedadPropiaAbierta).not.toHaveBeenCalled();
  });

  it('combina el pedido activo con su historial y la novedad propia abierta', async () => {
    const pedido: PedidoActivoDomiciliario = {
      id: 'solicitud-uuid',
      codigoPedido: 'MR-000123',
      estado: 'en_camino_entrega',
      direccionEntrega: 'Calle 1 #2-3',
      direccionFarmacia: 'Carrera 5 #6-7',
      creadoEn: '2026-08-20T10:00:00.000Z',
    };
    const historial = [
      {
        estado: 'asignado_en_camino_farmacia' as const,
        creadoEn: '2026-08-20T10:05:00.000Z',
      },
      {
        estado: 'en_camino_entrega' as const,
        creadoEn: '2026-08-20T10:30:00.000Z',
      },
    ];
    (solicitudes.obtenerPedidoActivo as jest.Mock).mockResolvedValue(pedido);
    (solicitudes.listarHistorialPedidoActivo as jest.Mock).mockResolvedValue(
      historial,
    );
    (solicitudes.obtenerNovedadPropiaAbierta as jest.Mock).mockResolvedValue({
      id: 'novedad-uuid',
      detalle: 'El paciente no contesta',
      creadoEn: '2026-08-20T10:35:00.000Z',
    });

    const resultado = await useCase.execute('domiciliario-uuid');

    expect(resultado).toEqual({
      ...pedido,
      historial,
      novedadPropiaAbierta: {
        id: 'novedad-uuid',
        detalle: 'El paciente no contesta',
        creadoEn: '2026-08-20T10:35:00.000Z',
      },
    });
    expect(solicitudes.listarHistorialPedidoActivo).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
    expect(solicitudes.obtenerNovedadPropiaAbierta).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
  });

  it('novedadPropiaAbierta queda null si no hay ninguna', async () => {
    (solicitudes.obtenerPedidoActivo as jest.Mock).mockResolvedValue({
      id: 'solicitud-uuid',
      codigoPedido: 'MR-000123',
      estado: 'medicamentos_recogidos',
      direccionEntrega: null,
      direccionFarmacia: null,
      creadoEn: '2026-08-20T10:00:00.000Z',
    });
    (solicitudes.listarHistorialPedidoActivo as jest.Mock).mockResolvedValue(
      [],
    );
    (solicitudes.obtenerNovedadPropiaAbierta as jest.Mock).mockResolvedValue(
      null,
    );

    const resultado = await useCase.execute('domiciliario-uuid');

    expect(resultado?.novedadPropiaAbierta).toBeNull();
  });
});
