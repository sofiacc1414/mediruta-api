import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarNovedadesAbiertasUseCase } from './listar-novedades-abiertas.use-case';

describe('ListarNovedadesAbiertasUseCase', () => {
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
    obtenerPedidoAdmin: jest.fn(),
    listarMedicamentosPedidoAdmin: jest.fn(),
    listarHistorialPedidoAdmin: jest.fn(),
    obtenerNovedadAbiertaPedidoAdmin: jest.fn(),
  };
  const useCase = new ListarNovedadesAbiertasUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G09 — delega en el repositorio y devuelve la lista tal cual', async () => {
    const novedades = [
      {
        id: 'novedad-uuid',
        solicitudId: 'solicitud-uuid',
        codigoPedido: 'MR-000123',
        detalle: 'No había uno de los medicamentos',
        reportadaPorCorreo: 'domiciliario@mediruta.test',
        creadoEn: '2026-08-24T10:00:00.000Z',
      },
    ];
    (solicitudes.listarNovedadesAbiertas as jest.Mock).mockResolvedValue(novedades);

    const resultado = await useCase.execute('admin-uuid');

    expect(solicitudes.listarNovedadesAbiertas).toHaveBeenCalledWith('admin-uuid');
    expect(resultado).toBe(novedades);
  });
});
