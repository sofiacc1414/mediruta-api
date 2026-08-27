import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { IniciarEntregaUseCase, MENSAJE_ENTREGA_INICIADA } from './iniciar-entrega.use-case';

describe('IniciarEntregaUseCase', () => {
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
  const useCase = new IniciarEntregaUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G05 — marca inicio de entrega y devuelve el mensaje de éxito', async () => {
    (solicitudes.iniciarEntrega as jest.Mock).mockResolvedValue('actualizado');

    const resultado = await useCase.execute('domiciliario-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ message: MENSAJE_ENTREGA_INICIADA });
    expect(solicitudes.iniciarEntrega).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
  });

  it('lanza SolicitudNoEncontradaError si no es del dueño o no está en el estado correcto', async () => {
    (solicitudes.iniciarEntrega as jest.Mock).mockResolvedValue('no_encontrado');

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
