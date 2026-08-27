import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_NOVEDAD_REPORTADA_PACIENTE,
  ReportarNovedadPacienteUseCase,
} from './reportar-novedad-paciente.use-case';

describe('ReportarNovedadPacienteUseCase', () => {
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
    reportarNovedadPaciente: jest.fn(),
    listarDomiciliariosCercanosAdmin: jest.fn(),
    asignarDomiciliarioAdmin: jest.fn(),
    obtenerConfiguracionAdmin: jest.fn(),
    actualizarConfiguracionAdmin: jest.fn(),
  };
  const useCase = new ReportarNovedadPacienteUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('reporta y devuelve mensaje + id', async () => {
    (solicitudes.reportarNovedadPaciente as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
    });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'solicitud-uuid',
      'No contesta',
    );

    expect(resultado).toEqual({
      message: MENSAJE_NOVEDAD_REPORTADA_PACIENTE,
      id: 'novedad-uuid',
    });
    expect(solicitudes.reportarNovedadPaciente).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      'No contesta',
    );
  });

  it('lanza SolicitudNoEncontradaError si el pedido no es del paciente o ya terminó', async () => {
    (solicitudes.reportarNovedadPaciente as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', 'No contesta'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
