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
    autocompletar: jest.fn(),
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

  it('no disponible si el Paciente no eligió nivel de copago — pero SÍ geocodifica (regresión: la confirmación de dirección debe verse igual sin copago)', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue({
      ...parametros,
      copago: null,
    });
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 6.2,
      lng: -75.6,
      direccionResuelta: 'Farmacia X resuelta',
      precisa: true,
    });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Farmacia X',
      'Casa Y',
    );

    expect(resultado).toEqual({
      disponible: false,
      motivo: 'sin_nivel_copago',
      direccionFarmaciaResuelta: 'Farmacia X resuelta',
      direccionFarmaciaPrecisa: true,
      direccionFarmaciaCandidatos: [],
      direccionEntregaResuelta: 'Farmacia X resuelta',
      direccionEntregaPrecisa: true,
      direccionEntregaCandidatos: [],
    });
    expect(geocodificacion.geocodificar as jest.Mock).toHaveBeenCalledTimes(2);
  });

  it('no disponible si Nominatim no resuelve alguna de las dos direcciones', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(parametros);
    (geocodificacion.geocodificar as jest.Mock)
      .mockResolvedValueOnce({
        lat: 6.2,
        lng: -75.6,
        direccionResuelta: 'Farmacia X resuelta',
        precisa: true,
      })
      .mockResolvedValueOnce(null);

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Farmacia X',
      'Dirección inventada',
    );

    expect(resultado).toEqual({
      disponible: false,
      motivo: 'sin_ubicaciones',
      direccionFarmaciaResuelta: 'Farmacia X resuelta',
      direccionFarmaciaPrecisa: true,
      direccionFarmaciaCandidatos: [],
      direccionEntregaResuelta: null,
      direccionEntregaPrecisa: true,
      direccionEntregaCandidatos: [],
    });
  });

  it('propaga direccionResuelta y precisa=false de cada dirección geocodificada (sin bloquear el precio)', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(parametros);
    (geocodificacion.geocodificar as jest.Mock)
      .mockResolvedValueOnce({
        lat: 6.2142018,
        lng: -75.5936713,
        direccionResuelta: 'Universidad de Medellín, Calle 30A, Los Alpes',
        precisa: false,
      })
      .mockResolvedValueOnce({
        lat: 6.2093857,
        lng: -75.5708593,
        direccionResuelta: 'Carrera 43A # 5A-113, El Poblado',
        precisa: true,
      });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'Universidad de Medellín',
      'Carrera 43A #5A-113',
    );

    expect(resultado?.direccionFarmaciaResuelta).toBe(
      'Universidad de Medellín, Calle 30A, Los Alpes',
    );
    expect(resultado?.direccionFarmaciaPrecisa).toBe(false);
    expect(resultado?.direccionEntregaResuelta).toBe(
      'Carrera 43A # 5A-113, El Poblado',
    );
    expect(resultado?.direccionEntregaPrecisa).toBe(true);
    // No bloquea: sigue calculando precio con el punto impreciso.
    expect(resultado?.disponible).toBe(true);
  });

  it('propaga los candidatos alternos cuando la dirección elegida no es precisa (ronda 11 — modal para elegir)', async () => {
    (
      solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock
    ).mockResolvedValue(parametros);
    const candidatoAlterno = {
      lat: 6.15,
      lng: -75.7,
      direccionResuelta: 'San Antonio de Prado, Medellín',
      precisa: true,
    };
    (geocodificacion.geocodificar as jest.Mock)
      .mockResolvedValueOnce({
        lat: 6.05,
        lng: -75.7,
        direccionResuelta: 'Amagá, Antioquia',
        precisa: false,
        candidatos: [candidatoAlterno],
      })
      .mockResolvedValueOnce({
        lat: 6.2093857,
        lng: -75.5708593,
        direccionResuelta: 'Carrera 43A # 5A-113, El Poblado',
        precisa: true,
      });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'San Antonio de Prado',
      'Carrera 43A #5A-113',
    );

    expect(resultado?.direccionFarmaciaCandidatos).toEqual([candidatoAlterno]);
    expect(resultado?.direccionEntregaCandidatos).toEqual([]);
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
