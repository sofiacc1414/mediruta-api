import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarNovedadesAbiertasUseCase } from './listar-novedades-abiertas.use-case';

describe('ListarNovedadesAbiertasUseCase', () => {
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
    adjuntarRecetaPropuestaEdicion: jest.fn(),
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
  const almacenamiento = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  } as unknown as AlmacenamientoArchivosPort;
  const useCase = new ListarNovedadesAbiertasUseCase(solicitudes, almacenamiento);

  beforeEach(() => jest.resetAllMocks());

  it('G09 — delega en el repositorio; novedades que no son de edición se devuelven tal cual', async () => {
    const novedades = [
      {
        id: 'novedad-uuid',
        solicitudId: 'solicitud-uuid',
        codigoPedido: 'MR-000123',
        detalle: 'No había uno de los medicamentos',
        reportadaPorCorreo: 'domiciliario@mediruta.test',
        origen: 'domiciliario' as const,
        tipo: 'pregunta' as const,
        datosActuales: null,
        datosPropuestos: null,
        codigoEntrega: null,
        creadoEn: '2026-08-24T10:00:00.000Z',
      },
    ];
    (solicitudes.listarNovedadesAbiertas as jest.Mock).mockResolvedValue(
      novedades,
    );

    const resultado = await useCase.execute('admin-uuid');

    expect(solicitudes.listarNovedadesAbiertas).toHaveBeenCalledWith(
      'admin-uuid',
      'abierta',
    );
    expect(almacenamiento.obtenerUrlFirmada).not.toHaveBeenCalled();
    expect(resultado).toEqual(novedades);
  });

  it('ronda 6 — pasa el estado recibido al repositorio', async () => {
    (solicitudes.listarNovedadesAbiertas as jest.Mock).mockResolvedValue([]);

    await useCase.execute('admin-uuid', 'aprobada');

    expect(solicitudes.listarNovedadesAbiertas).toHaveBeenCalledWith(
      'admin-uuid',
      'aprobada',
    );
  });

  it('ronda 6 — un estado inválido cae a "abierta" en vez de fallar', async () => {
    (solicitudes.listarNovedadesAbiertas as jest.Mock).mockResolvedValue([]);

    await useCase.execute('admin-uuid', 'no-existe');

    expect(solicitudes.listarNovedadesAbiertas).toHaveBeenCalledWith(
      'admin-uuid',
      'abierta',
    );
  });

  it('firma la receta actual y la propuesta cuando la novedad es de tipo edición', async () => {
    (solicitudes.listarNovedadesAbiertas as jest.Mock).mockResolvedValue([
      {
        id: 'novedad-uuid',
        solicitudId: 'solicitud-uuid',
        codigoPedido: 'MR-000123',
        detalle: 'Pedido corrección de receta',
        reportadaPorCorreo: 'paciente@mediruta.test',
        origen: 'paciente' as const,
        tipo: 'edicion' as const,
        datosActuales: { direccionEntrega: null, direccionFarmacia: null },
        datosPropuestos: {
          direccionEntrega: null,
          direccionFarmacia: null,
          recetaPath: 'solicitud/solicitud-uuid/receta_propuesta.jpg',
        },
        codigoEntrega: null,
        recetaPathActual: 'solicitud/solicitud-uuid/receta.jpg',
        creadoEn: '2026-08-24T10:00:00.000Z',
      },
    ]);
    (almacenamiento.obtenerUrlFirmada as jest.Mock)
      .mockResolvedValueOnce('https://storage/receta-actual-firmada')
      .mockResolvedValueOnce('https://storage/receta-propuesta-firmada');

    const [resultado] = await useCase.execute('admin-uuid');

    expect(resultado.recetaActualUrl).toBe('https://storage/receta-actual-firmada');
    expect(resultado.recetaPropuestaUrl).toBe(
      'https://storage/receta-propuesta-firmada',
    );
    expect(resultado).not.toHaveProperty('recetaPathActual');
  });
});
