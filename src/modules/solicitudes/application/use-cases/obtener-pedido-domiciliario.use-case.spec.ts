import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  PedidoActivoDomiciliario,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { ObtenerPedidoDomiciliarioUseCase } from './obtener-pedido-domiciliario.use-case';

describe('ObtenerPedidoDomiciliarioUseCase', () => {
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
    listarNovedadesSolicitud: jest.fn(),
    listarNovedadesSolicitudDomiciliario: jest.fn(),
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
    obtenerPedidoPorId: jest.fn(),
    listarHistorialPedidos: jest.fn(),
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
    obtenerDocumentosPacienteParaRecoger: jest.fn(),
    listarPedidosAdmin: jest.fn(),
    obtenerPedidoAdmin: jest.fn(),
    listarMedicamentosPedidoAdmin: jest.fn(),
    listarHistorialPedidoAdmin: jest.fn(),
    obtenerNovedadAbiertaPedidoAdmin: jest.fn(),
    reportarNovedadPaciente: jest.fn(),
    solicitarEdicionPedido: jest.fn(),
    reportarCodigoNoGenerado: jest.fn(),
    aprobarEdicionPedidoAdmin: jest.fn(),
    obtenerDatosGeocodificacionNovedadAdmin: jest.fn(),
    rechazarEdicionPedidoAdmin: jest.fn(),
    regenerarCodigoEntregaAdmin: jest.fn(),
    obtenerCodigoEntregaParaCorreoAdmin: jest.fn(),
    listarDomiciliariosCercanosAdmin: jest.fn(),
    asignarDomiciliarioAdmin: jest.fn(),
    obtenerConfiguracionAdmin: jest.fn(),
    actualizarConfiguracionAdmin: jest.fn(),
    obtenerDatosPrecioPedido: jest.fn(),
    listarNivelesCopagoAdmin: jest.fn(),
    guardarNivelCopagoAdmin: jest.fn(),
    eliminarNivelCopagoAdmin: jest.fn(),
  };
  const useCase = new ObtenerPedidoDomiciliarioUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lanza SolicitudNoEncontradaError si el id no existe o no es del Domiciliario', async () => {
    (solicitudes.obtenerPedidoPorId as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid'),
    ).rejects.toThrow(SolicitudNoEncontradaError);
    expect(solicitudes.listarHistorialPedidoActivo).not.toHaveBeenCalled();
    expect(solicitudes.obtenerNovedadPropiaAbierta).not.toHaveBeenCalled();
  });

  it('combina el pedido (en cualquier estado) con su historial y la novedad propia abierta', async () => {
    const pedido: PedidoActivoDomiciliario = {
      id: 'solicitud-uuid',
      codigoPedido: 'MR-000123',
      estado: 'entregado',
      direccionEntrega: 'Calle 1 #2-3',
      direccionFarmacia: 'Carrera 5 #6-7',
      creadoEn: '2026-08-20T10:00:00.000Z',
    };
    const historial = [
      {
        estado: 'asignado_en_camino_farmacia' as const,
        creadoEn: '2026-08-20T10:05:00.000Z',
      },
      { estado: 'entregado' as const, creadoEn: '2026-08-20T11:00:00.000Z' },
    ];
    (solicitudes.obtenerPedidoPorId as jest.Mock).mockResolvedValue(pedido);
    (solicitudes.listarHistorialPedidoActivo as jest.Mock).mockResolvedValue(
      historial,
    );
    (solicitudes.obtenerNovedadPropiaAbierta as jest.Mock).mockResolvedValue(
      null,
    );

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
    );

    expect(resultado).toEqual({
      ...pedido,
      historial,
      novedadPropiaAbierta: null,
    });
    expect(solicitudes.obtenerPedidoPorId).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
    expect(solicitudes.listarHistorialPedidoActivo).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
    expect(solicitudes.obtenerNovedadPropiaAbierta).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
  });

  it('también sirve para un pedido cancelado', async () => {
    (solicitudes.obtenerPedidoPorId as jest.Mock).mockResolvedValue({
      id: 'solicitud-uuid',
      codigoPedido: 'MR-000456',
      estado: 'cancelada',
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

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
    );

    expect(resultado.estado).toBe('cancelada');
  });
});
