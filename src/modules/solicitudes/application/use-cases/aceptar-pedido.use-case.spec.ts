import { PedidoYaAsignadoError } from '../../domain/errors/pedido-ya-asignado.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { AceptarPedidoUseCase, MENSAJE_PEDIDO_ACEPTADO } from './aceptar-pedido.use-case';

describe('AceptarPedidoUseCase', () => {
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
  };
  const useCase = new AceptarPedidoUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('G03 — acepta y devuelve el mensaje de éxito', async () => {
    (solicitudes.aceptarPedido as jest.Mock).mockResolvedValue('aceptado');

    const resultado = await useCase.execute('domiciliario-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ message: MENSAJE_PEDIDO_ACEPTADO });
    expect(solicitudes.aceptarPedido).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
  });

  it('lanza PedidoYaAsignadoError si otro domiciliario lo tomó primero', async () => {
    (solicitudes.aceptarPedido as jest.Mock).mockResolvedValue('ya_asignado');

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(PedidoYaAsignadoError);
  });

  it('lanza SolicitudNoEncontradaError si no existe/no está en_asignacion', async () => {
    (solicitudes.aceptarPedido as jest.Mock).mockResolvedValue('no_encontrado');

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
