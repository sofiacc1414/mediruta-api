import { CodigoEntregaIncorrectoError } from '../../domain/errors/codigo-entrega-incorrecto.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { EntregarPedidoUseCase, MENSAJE_PEDIDO_ENTREGADO } from './entregar-pedido.use-case';

describe('EntregarPedidoUseCase', () => {
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
  const useCase = new EntregarPedidoUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G07 — entrega con el código correcto y devuelve el mensaje de éxito', async () => {
    (solicitudes.entregarPedido as jest.Mock).mockResolvedValue('entregado');

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
      '8SBM9J',
    );

    expect(resultado).toEqual({ message: MENSAJE_PEDIDO_ENTREGADO });
    expect(solicitudes.entregarPedido).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
      '8SBM9J',
    );
  });

  it('lanza CodigoEntregaIncorrectoError si el código no coincide', async () => {
    (solicitudes.entregarPedido as jest.Mock).mockResolvedValue('codigo_incorrecto');

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid', 'ZZZZZZ'),
    ).rejects.toBeInstanceOf(CodigoEntregaIncorrectoError);
  });

  it('lanza SolicitudNoEncontradaError si no es del dueño o no está en_sitio', async () => {
    (solicitudes.entregarPedido as jest.Mock).mockResolvedValue('no_encontrado');

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid', '8SBM9J'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
