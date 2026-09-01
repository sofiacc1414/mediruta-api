import { SolicitudIncompletaError } from '../../domain/errors/solicitud-incompleta.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  EnviarSolicitudUseCase,
  MENSAJE_SOLICITUD_ENVIADA,
} from './enviar-solicitud.use-case';

describe('EnviarSolicitudUseCase', () => {
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
    solicitarEdicionPedido: jest.fn(),
    reportarCodigoNoGenerado: jest.fn(),
    aprobarEdicionPedidoAdmin: jest.fn(),
    rechazarEdicionPedidoAdmin: jest.fn(),
    regenerarCodigoEntregaAdmin: jest.fn(),
    obtenerCodigoEntregaParaCorreoAdmin: jest.fn(),
    listarDomiciliariosCercanosAdmin: jest.fn(),
    asignarDomiciliarioAdmin: jest.fn(),
    obtenerConfiguracionAdmin: jest.fn(),
    actualizarConfiguracionAdmin: jest.fn(),
  };
  const geocodificacion: GeocodificacionPort = {
    geocodificar: jest.fn(),
  };
  const useCase = new EnviarSolicitudUseCase(solicitudes, geocodificacion);

  beforeEach(() => {
    jest.resetAllMocks();
    (
      solicitudes.obtenerDatosGeocodificacionFarmacia as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: 'Farmacia La Rebaja Cl 80',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
    });
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 4.6486,
      lng: -74.0628,
    });
  });

  it('G05 — geocodifica la farmacia y envía con las coordenadas resueltas', async () => {
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'enviada',
      codigoPedido: 'MR-000123',
    });

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({
      message: MENSAJE_SOLICITUD_ENVIADA,
      codigoPedido: 'MR-000123',
    });
    expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
      'Farmacia La Rebaja Cl 80',
      'Bogotá',
      'Cundinamarca',
    );
    expect(solicitudes.enviar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      4.6486,
      -74.0628,
    );
  });

  it('si Nominatim no resuelve la dirección, envía igual con lat/lng null (no bloquea)', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue(null);
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'enviada',
      codigoPedido: 'MR-000123',
    });

    await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(solicitudes.enviar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      null,
      null,
    );
  });

  it('sin dirección de farmacia todavía, no llama a geocodificar', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionFarmacia as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: null,
      ciudad: null,
      departamento: null,
    });
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'incompleta',
      faltantes: ['Dirección de la farmacia'],
    });

    await useCase
      .execute('paciente-uuid', 'solicitud-uuid')
      .catch((e: unknown) => e);

    expect(geocodificacion.geocodificar).not.toHaveBeenCalled();
    expect(solicitudes.enviar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      null,
      null,
    );
  });

  it('lanza SolicitudIncompletaError con lo que falta', async () => {
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'incompleta',
      faltantes: ['Nombre del medicamento', 'Registro médico'],
    });

    const error = await useCase
      .execute('paciente-uuid', 'solicitud-uuid')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SolicitudIncompletaError);
    expect((error as SolicitudIncompletaError).faltantes).toEqual([
      'Nombre del medicamento',
      'Registro médico',
    ]);
  });

  it('lanza SolicitudNoEncontradaError si no hay una solicitud propia en Borrador con ese id', async () => {
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrada',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
