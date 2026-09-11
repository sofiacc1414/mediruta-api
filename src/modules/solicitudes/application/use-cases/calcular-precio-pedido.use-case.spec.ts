import {
  DatosPrecioPedido,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { CalcularPrecioPedidoUseCase } from './calcular-precio-pedido.use-case';

describe('CalcularPrecioPedidoUseCase', () => {
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
    listarNivelesCopagoAdmin: jest.fn(),
    guardarNivelCopagoAdmin: jest.fn(),
    eliminarNivelCopagoAdmin: jest.fn(),
  };
  const useCase = new CalcularPrecioPedidoUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const parametros = {
    tarifaBaseDomicilio: 7000,
    tarifaPorKm: 800,
    tarifaPorMinuto: 150,
    tiempoBaseFarmaciaMin: 10,
    velocidadPromedioKmh: 20,
    distanciaIncluidaKm: 15,
    tarifaPorKmExcedente: 1600,
  };

  it('null si la solicitud no existe o no es del dueño', async () => {
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(null);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toBeNull();
  });

  it('no disponible si el Paciente no eligió nivel de copago', async () => {
    const datos: DatosPrecioPedido = {
      copago: null,
      distanciaMetros: 3000,
      ...parametros,
    };
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(datos);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ disponible: false, motivo: 'sin_nivel_copago' });
  });

  it('no disponible si falta geocodificar farmacia y/o entrega', async () => {
    const datos: DatosPrecioPedido = {
      copago: 15000,
      distanciaMetros: null,
      ...parametros,
    };
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(datos);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ disponible: false, motivo: 'sin_ubicaciones' });
  });

  it('Nivel 2 a 3km — cae dentro del rango 25-30k acordado', async () => {
    const datos: DatosPrecioPedido = {
      copago: 15000,
      distanciaMetros: 3000,
      ...parametros,
    };
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(datos);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    // domicilio = 7000 + 800*3 = 9400 (sin componente de tiempo, ver doc)
    // total = 15000 + 9400 = 24400
    expect(resultado).toEqual({
      disponible: true,
      copago: 15000,
      domicilio: 9400,
      total: 24400,
      distanciaKm: 3,
    });
  });

  it('cobra el excedente al pasar el umbral de distancia incluida', async () => {
    const datos: DatosPrecioPedido = {
      copago: 25000,
      distanciaMetros: 20000,
      ...parametros,
    };
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(datos);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    // domicilio = 7000 + 800*20 + (20-15)*1600 = 7000+16000+8000 = 31000
    // total = 25000 + 31000 = 56000
    expect(resultado).toEqual({
      disponible: true,
      copago: 25000,
      domicilio: 31000,
      total: 56000,
      distanciaKm: 20,
    });
  });

  it('no cobra excedente por debajo del umbral de distancia incluida', async () => {
    const datos: DatosPrecioPedido = {
      copago: 8000,
      distanciaMetros: 5000,
      ...parametros,
    };
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(datos);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toMatchObject({ disponible: true });
    if (resultado?.disponible) {
      // domicilio = 7000 + 800*5 = 11000
      expect(resultado.domicilio).toBe(11000);
    }
  });
});
