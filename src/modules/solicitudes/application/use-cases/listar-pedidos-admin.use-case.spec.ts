import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarPedidosAdminUseCase } from './listar-pedidos-admin.use-case';

describe('ListarPedidosAdminUseCase', () => {
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
  const useCase = new ListarPedidosAdminUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('delega adminId y filtros en el repositorio, devuelve la lista tal cual', async () => {
    const pedidos = [
      {
        id: 'solicitud-uuid',
        codigoPedido: 'MR-000123',
        estado: 'entregado' as const,
        pacienteNombre: 'Persona de Prueba',
        pacienteCorreo: 'paciente@mail.com',
        domiciliarioNombre: 'Domiciliario de Prueba',
        domiciliarioCorreo: 'domiciliario@mail.com',
        direccionEntrega: 'Calle 1 #2-3',
        direccionFarmacia: 'Carrera 5 #6-7',
        creadoEn: '2026-08-20T10:00:00.000Z',
        enviadoEn: '2026-08-20T10:05:00.000Z',
      },
    ];
    (solicitudes.listarPedidosAdmin as jest.Mock).mockResolvedValue(pedidos);

    const filtros = { estado: 'entregado' as const, busqueda: 'MR-000123' };
    const resultado = await useCase.execute('admin-uuid', filtros);

    expect(solicitudes.listarPedidosAdmin).toHaveBeenCalledWith('admin-uuid', filtros);
    expect(resultado).toBe(pedidos);
  });

  it('funciona sin filtros (lista completa, tope de 200 en el repositorio)', async () => {
    (solicitudes.listarPedidosAdmin as jest.Mock).mockResolvedValue([]);

    await useCase.execute('admin-uuid', {});

    expect(solicitudes.listarPedidosAdmin).toHaveBeenCalledWith('admin-uuid', {});
  });
});
