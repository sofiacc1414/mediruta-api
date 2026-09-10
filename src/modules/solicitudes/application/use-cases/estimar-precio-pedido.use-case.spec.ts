import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import {
  ParametrosEstimacionPrecio,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { EstimarPrecioPedidoUseCase } from './estimar-precio-pedido.use-case';

describe('EstimarPrecioPedidoUseCase', () => {
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
    adjuntarRecetaPropuestaEdicion: jest.fn(),
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
    obtenerParametrosEstimacionPrecio: jest.fn(),
    listarNivelesCopagoAdmin: jest.fn(),
    guardarNivelCopagoAdmin: jest.fn(),
    eliminarNivelCopagoAdmin: jest.fn(),
  };
  const geocodificacion: GeocodificacionPort = {
    geocodificar: jest.fn(),
  };
  const useCase = new EstimarPrecioPedidoUseCase(solicitudes, geocodificacion);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const parametros: ParametrosEstimacionPrecio = {
    copago: 15000,
    ciudad: 'medellin',
    departamento: 'antioquia',
    tarifaBaseDomicilio: 20000,
    tarifaPorKm: 1200,
    tarifaPorMinuto: 200,
    tiempoBaseFarmaciaMin: 10,
    velocidadPromedioKmh: 20,
    distanciaIncluidaKm: 15,
    tarifaPorKmExcedente: 2400,
  };

  it('null si el Paciente no tiene perfil (nunca debería pasar, pero no explota)', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(null);

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Farmacia X',
      'Casa Y',
    );

    expect(resultado).toBeNull();
    expect(geocodificacion.geocodificar as jest.Mock).not.toHaveBeenCalled();
  });

  it('no disponible si el Paciente no eligió nivel de copago — ni geocodifica', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue({
      ...parametros,
      copago: null,
    });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Farmacia X',
      'Casa Y',
    );

    expect(resultado).toEqual({
      disponible: false,
      motivo: 'sin_nivel_copago',
    });
    expect(geocodificacion.geocodificar as jest.Mock).not.toHaveBeenCalled();
  });

  it('no disponible si Nominatim no resuelve alguna de las dos direcciones', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(parametros);
    (geocodificacion.geocodificar as jest.Mock)
      .mockResolvedValueOnce({ lat: 6.2, lng: -75.6 })
      .mockResolvedValueOnce(null);

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Farmacia X',
      'Dirección inventada',
    );

    expect(resultado).toEqual({ disponible: false, motivo: 'sin_ubicaciones' });
  });

  it('calcula el precio con la distancia real entre los dos puntos geocodificados', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(parametros);
    // Carrera 70 #44-50 y Carrera 43A #5A-113 (Medellín) — ~2.58 km reales.
    (geocodificacion.geocodificar as jest.Mock)
      .mockResolvedValueOnce({ lat: 6.2142018, lng: -75.5936713 })
      .mockResolvedValueOnce({ lat: 6.2093857, lng: -75.5708593 });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Carrera 70 #44-50',
      'Carrera 43A #5A-113',
    );

    expect(resultado?.disponible).toBe(true);
    if (resultado?.disponible) {
      expect(resultado.distanciaKm).toBeCloseTo(2.6, 1);
      expect(resultado.copago).toBe(15000);
      expect(resultado.total).toBeGreaterThan(resultado.copago);
    }
  });

  it('geocodifica ambas direcciones con la ciudad/departamento del perfil', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(parametros);
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 6.2,
      lng: -75.6,
    });

    await useCase.execute('paciente-uuid', 'Farmacia X', 'Casa Y');

    expect(geocodificacion.geocodificar as jest.Mock).toHaveBeenCalledWith(
      'Farmacia X',
      'medellin',
      'antioquia',
    );
    expect(geocodificacion.geocodificar as jest.Mock).toHaveBeenCalledWith(
      'Casa Y',
      'medellin',
      'antioquia',
    );
  });
});
