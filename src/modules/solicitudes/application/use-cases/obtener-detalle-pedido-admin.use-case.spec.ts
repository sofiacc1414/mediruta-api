import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  PedidoAdminDetalle,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { ObtenerDetallePedidoAdminUseCase } from './obtener-detalle-pedido-admin.use-case';

describe('ObtenerDetallePedidoAdminUseCase', () => {
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
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const useCase = new ObtenerDetallePedidoAdminUseCase(
    solicitudes,
    almacenamiento,
  );

  const detalle: PedidoAdminDetalle = {
    id: 'solicitud-uuid',
    codigoPedido: 'MR-000123',
    estado: 'entregado',
    recetaPath: 'solicitud/solicitud-uuid/receta.jpg',
    recetaFechaVencimiento: '2026-08-01',
    direccionEntrega: 'Calle 1 #2-3',
    direccionFarmacia: 'Carrera 5 #6-7',
    creadoEn: '2026-08-20T10:00:00.000Z',
    enviadoEn: '2026-08-20T10:05:00.000Z',
    canceladoEn: null,
    codigoEntrega: 'AB23CD',
    pacienteNombre: 'Persona de Prueba',
    pacienteCorreo: 'paciente@mail.com',
    pacienteTelefono: '3001234567',
    pacienteCedulaFrentePath: 'paciente/usuario-uuid/cedula_frente.jpg',
    pacienteCedulaReversoPath: 'paciente/usuario-uuid/cedula_reverso.jpg',
    domiciliarioNombre: 'Domiciliario de Prueba',
    domiciliarioCorreo: 'domiciliario@mail.com',
    domiciliarioTelefono: '3007654321',
    enAsignacionDesde: '2026-08-20T10:06:00.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
    (solicitudes.listarMedicamentosPedidoAdmin as jest.Mock).mockResolvedValue(
      [],
    );
    (solicitudes.listarHistorialPedidoAdmin as jest.Mock).mockResolvedValue([]);
    (
      solicitudes.obtenerNovedadAbiertaPedidoAdmin as jest.Mock
    ).mockResolvedValue(null);
  });

  it('resuelve receta y cédula (ambos lados) a URLs firmadas, incluye medicamentos e historial', async () => {
    (solicitudes.obtenerPedidoAdmin as jest.Mock).mockResolvedValue(detalle);
    const medicamentos = [
      {
        nombre: 'Acetaminofén',
        concentracion: '500mg',
        formaFarmaceutica: 'Tableta',
        cantidad: '30 tabletas',
        posologia: 'Cada 8 horas',
      },
    ];
    const historial = [
      { estado: 'entregado' as const, creadoEn: '2026-08-21T10:00:00.000Z' },
    ];
    (solicitudes.listarMedicamentosPedidoAdmin as jest.Mock).mockResolvedValue(
      medicamentos,
    );
    (solicitudes.listarHistorialPedidoAdmin as jest.Mock).mockResolvedValue(
      historial,
    );

    const resultado = await useCase.execute('admin-uuid', 'solicitud-uuid');

    expect(resultado.codigoPedido).toBe('MR-000123');
    expect(resultado.recetaUrl).toBe(
      'https://firmada.test/solicitud/solicitud-uuid/receta.jpg',
    );
    expect(resultado.paciente).toEqual({
      nombre: 'Persona de Prueba',
      correo: 'paciente@mail.com',
      telefono: '3001234567',
      cedulaFrenteUrl:
        'https://firmada.test/paciente/usuario-uuid/cedula_frente.jpg',
      cedulaReversoUrl:
        'https://firmada.test/paciente/usuario-uuid/cedula_reverso.jpg',
    });
    expect(resultado.domiciliario).toEqual({
      nombre: 'Domiciliario de Prueba',
      correo: 'domiciliario@mail.com',
      telefono: '3007654321',
    });
    expect(resultado.medicamentos).toBe(medicamentos);
    expect(resultado.historial).toBe(historial);
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'solicitud/solicitud-uuid/receta.jpg',
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  });

  it('domiciliario queda null si el pedido todavía no tiene uno asignado', async () => {
    (solicitudes.obtenerPedidoAdmin as jest.Mock).mockResolvedValue({
      ...detalle,
      domiciliarioNombre: null,
      domiciliarioCorreo: null,
      domiciliarioTelefono: null,
    });

    const resultado = await useCase.execute('admin-uuid', 'solicitud-uuid');

    expect(resultado.domiciliario).toBeNull();
  });

  it('lanza SolicitudNoEncontradaError si no existe', async () => {
    (solicitudes.obtenerPedidoAdmin as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });

  it('las URLs quedan null (no revienta con 500) si Storage no puede firmar la URL', async () => {
    (solicitudes.obtenerPedidoAdmin as jest.Mock).mockResolvedValue(detalle);
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockRejectedValue(
      new Error('Object not found'),
    );

    const resultado = await useCase.execute('admin-uuid', 'solicitud-uuid');

    expect(resultado.recetaUrl).toBeNull();
    expect(resultado.paciente.cedulaFrenteUrl).toBeNull();
    expect(resultado.paciente.cedulaReversoUrl).toBeNull();
  });
});
