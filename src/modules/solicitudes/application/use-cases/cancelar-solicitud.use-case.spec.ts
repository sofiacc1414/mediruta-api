import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  CancelarSolicitudUseCase,
  MENSAJE_SOLICITUD_CANCELADA,
} from './cancelar-solicitud.use-case';

describe('CancelarSolicitudUseCase', () => {
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
  const useCase = new CancelarSolicitudUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G06 — cancela y devuelve el mensaje de éxito', async () => {
    (solicitudes.cancelar as jest.Mock).mockResolvedValue('cancelada');

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ message: MENSAJE_SOLICITUD_CANCELADA });
    expect(solicitudes.cancelar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
    );
  });

  it('lanza SolicitudNoEncontradaError si no existe, no es del dueño, o ya estaba cancelada', async () => {
    (solicitudes.cancelar as jest.Mock).mockResolvedValue('no_encontrada');

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
