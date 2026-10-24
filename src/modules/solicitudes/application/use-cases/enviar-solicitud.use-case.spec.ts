import { MedioPagoNoHabilitadoError } from '../../domain/errors/medio-pago-no-habilitado.error';
import { PagoTarjetaRechazadoError } from '../../domain/errors/pago-tarjeta-rechazado.error';
import { PagoTransferenciaRechazadoError } from '../../domain/errors/pago-transferencia-rechazado.error';
import { SolicitudIncompletaError } from '../../domain/errors/solicitud-incompleta.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { PagoTarjetaPort } from '../../domain/ports/pago-tarjeta.port';
import { PagoTransferenciaPort } from '../../domain/ports/pago-transferencia.port';
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
    obtenerMediosPagoHabilitados: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
    obtenerDatosGeocodificacionFarmacia: jest.fn(),
    obtenerNovedadAbierta: jest.fn(),
    listarNovedadesSolicitud: jest.fn(),
    listarNovedadesSolicitudDomiciliario: jest.fn(),
    listarPedidosDisponibles: jest.fn(),
    aceptarPedido: jest.fn(),
    marcarEnFarmacia: jest.fn(),
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
  const pagoTarjeta: PagoTarjetaPort = {
    procesar: jest.fn(),
  };
  const pagoTransferencia: PagoTransferenciaPort = {
    procesar: jest.fn(),
  };
  const useCase = new EnviarSolicitudUseCase(
    solicitudes,
    geocodificacion,
    pagoTarjeta,
    pagoTransferencia,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (
      solicitudes.obtenerDatosGeocodificacionFarmacia as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: 'Farmacia La Rebaja Cl 80',
      direccionEntrega: 'Calle 1 #2-3',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
    });
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 4.6486,
      lng: -74.0628,
    });
    (solicitudes.obtenerMediosPagoHabilitados as jest.Mock).mockResolvedValue({
      pagoEfectivoHabilitado: true,
      pagoTarjetaHabilitado: true,
      pagoTransferenciaHabilitado: true,
    });
    (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue(null);
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
    expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
      'Calle 1 #2-3',
      'Bogotá',
      'Cundinamarca',
    );
    expect(solicitudes.enviar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      4.6486,
      -74.0628,
      4.6486,
      -74.0628,
      'efectivo',
      null,
      null,
      null,
      null,
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
      null,
      null,
      'efectivo',
      null,
      null,
      null,
      null,
    );
  });

  it('sin dirección de farmacia ni entrega todavía, no llama a geocodificar', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionFarmacia as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: null,
      direccionEntrega: null,
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
      null,
      null,
      'efectivo',
      null,
      null,
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

  // Ronda 14 — bug real reportado: aunque el estimado en vivo ya
  // hubiera confirmado la dirección, "Enviar solicitud" la volvía a
  // geocodificar desde cero — un segundo viaje a Nominatim que podía
  // fallar aunque el primero hubiera funcionado (peor que en el
  // perfil: acá, si falla, el pedido queda SIN ubicación, en
  // silencio). Si la App manda las coordenadas ya confirmadas para el
  // mismo texto que hay guardado, se usan directo.
  describe('verificación previa — evita repetir la geocodificación si la App ya la confirmó', () => {
    it('usa lat/lng ya confirmados para farmacia y entrega, sin llamar a geocodificar', async () => {
      (solicitudes.enviar as jest.Mock).mockResolvedValue({
        resultado: 'enviada',
        codigoPedido: 'MR-000123',
      });

      await useCase.execute(
        'paciente-uuid',
        'solicitud-uuid',
        {
          direccionVerificadaPara: 'Farmacia La Rebaja Cl 80',
          lat: 4.7,
          lng: -74.1,
        },
        { direccionVerificadaPara: 'Calle 1 #2-3', lat: 4.8, lng: -74.2 },
      );

      expect(geocodificacion.geocodificar).not.toHaveBeenCalled();
      expect(solicitudes.enviar).toHaveBeenCalledWith(
        'paciente-uuid',
        'solicitud-uuid',
        4.7,
        -74.1,
        4.8,
        -74.2,
        'efectivo',
        null,
        null,
        null,
        null,
      );
    });

    it('ignora la verificación previa si el texto ya no coincide (se editó después de confirmar) y geocodifica como siempre', async () => {
      (solicitudes.enviar as jest.Mock).mockResolvedValue({
        resultado: 'enviada',
        codigoPedido: 'MR-000123',
      });

      await useCase.execute(
        'paciente-uuid',
        'solicitud-uuid',
        {
          direccionVerificadaPara: 'Un texto viejo que ya no es el actual',
          lat: 4.7,
          lng: -74.1,
        },
        undefined,
      );

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
        4.6486,
        -74.0628,
        'efectivo',
        null,
        null,
        null,
        null,
      );
    });

    it('solo confía en la que coincide — la otra dirección se geocodifica igual si no viene verificada', async () => {
      (solicitudes.enviar as jest.Mock).mockResolvedValue({
        resultado: 'enviada',
        codigoPedido: 'MR-000123',
      });

      await useCase.execute(
        'paciente-uuid',
        'solicitud-uuid',
        {
          direccionVerificadaPara: 'Farmacia La Rebaja Cl 80',
          lat: 4.7,
          lng: -74.1,
        },
        undefined,
      );

      expect(geocodificacion.geocodificar).toHaveBeenCalledTimes(1);
      expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
        'Calle 1 #2-3',
        'Bogotá',
        'Cundinamarca',
      );
      expect(solicitudes.enviar).toHaveBeenCalledWith(
        'paciente-uuid',
        'solicitud-uuid',
        4.7,
        -74.1,
        4.6486,
        -74.0628,
        'efectivo',
        null,
        null,
        null,
        null,
      );
    });
  });

  describe('Módulo 4 — medio de pago', () => {
    beforeEach(() => {
      (solicitudes.obtenerDatosPrecioPedido as jest.Mock).mockResolvedValue({
        copago: 15000,
        tarifaBaseDomicilio: 7000,
        tarifaPorKm: 800,
        tarifaPorMinuto: 150,
        tiempoBaseFarmaciaMin: 10,
        velocidadPromedioKmh: 20,
        distanciaIncluidaKm: 15,
        tarifaPorKmExcedente: 1600,
        comisionAppPorcentaje: 0.2,
      });
      (solicitudes.enviar as jest.Mock).mockResolvedValue({
        resultado: 'enviada',
        codigoPedido: 'MR-000123',
      });
    });

    it('lanza MedioPagoNoHabilitadoError si el admin deshabilitó ese medio', async () => {
      (solicitudes.obtenerMediosPagoHabilitados as jest.Mock).mockResolvedValue(
        {
          pagoEfectivoHabilitado: true,
          pagoTarjetaHabilitado: false,
          pagoTransferenciaHabilitado: true,
        },
      );

      await expect(
        useCase.execute(
          'paciente-uuid',
          'solicitud-uuid',
          undefined,
          undefined,
          'tarjeta',
          '4242424242424242',
        ),
      ).rejects.toBeInstanceOf(MedioPagoNoHabilitadoError);
      expect(solicitudes.enviar).not.toHaveBeenCalled();
    });

    it('tarjeta aprobada — calcula el precio y lo pasa a enviar()', async () => {
      (pagoTarjeta.procesar as jest.Mock).mockResolvedValue('aprobado');

      await useCase.execute(
        'paciente-uuid',
        'solicitud-uuid',
        undefined,
        undefined,
        'tarjeta',
        '4242424242424242',
      );

      expect(pagoTarjeta.procesar).toHaveBeenCalledWith(
        '4242424242424242',
        expect.any(Number),
      );
      expect(solicitudes.enviar).toHaveBeenCalledWith(
        'paciente-uuid',
        'solicitud-uuid',
        4.6486,
        -74.0628,
        4.6486,
        -74.0628,
        'tarjeta',
        15000,
        expect.any(Number),
        0.2,
        null,
      );
    });

    it('tarjeta rechazada — lanza PagoTarjetaRechazadoError y nunca llama a enviar()', async () => {
      (pagoTarjeta.procesar as jest.Mock).mockResolvedValue('rechazado');

      await expect(
        useCase.execute(
          'paciente-uuid',
          'solicitud-uuid',
          undefined,
          undefined,
          'tarjeta',
          '4000000000000002',
        ),
      ).rejects.toBeInstanceOf(PagoTarjetaRechazadoError);
      expect(solicitudes.enviar).not.toHaveBeenCalled();
    });

    it('transferencia aprobada — calcula el precio, no manda comprobante y pasa a enviar()', async () => {
      (pagoTransferencia.procesar as jest.Mock).mockResolvedValue('aprobado');

      await useCase.execute(
        'paciente-uuid',
        'solicitud-uuid',
        undefined,
        undefined,
        'transferencia',
      );

      expect(pagoTransferencia.procesar).toHaveBeenCalledWith(
        expect.any(Number),
      );
      expect(solicitudes.enviar).toHaveBeenCalledWith(
        'paciente-uuid',
        'solicitud-uuid',
        4.6486,
        -74.0628,
        4.6486,
        -74.0628,
        'transferencia',
        15000,
        expect.any(Number),
        0.2,
        null,
      );
    });

    it('transferencia rechazada — lanza PagoTransferenciaRechazadoError y nunca llama a enviar()', async () => {
      (pagoTransferencia.procesar as jest.Mock).mockResolvedValue('rechazado');

      await expect(
        useCase.execute(
          'paciente-uuid',
          'solicitud-uuid',
          undefined,
          undefined,
          'transferencia',
        ),
      ).rejects.toBeInstanceOf(PagoTransferenciaRechazadoError);
      expect(solicitudes.enviar).not.toHaveBeenCalled();
    });
  });
});
