import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  Medicamento,
  SolicitudDetalle,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { ObtenerSolicitudUseCase } from './obtener-solicitud.use-case';

describe('ObtenerSolicitudUseCase', () => {
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
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
  };
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const useCase = new ObtenerSolicitudUseCase(solicitudes, almacenamiento);

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
    (solicitudes.listarMedicamentos as jest.Mock).mockResolvedValue([]);
    (solicitudes.listarHistorial as jest.Mock).mockResolvedValue([]);
    (solicitudes.obtenerNovedadAbierta as jest.Mock).mockResolvedValue(null);
  });

  it('G03 — resuelve receta y cédula a URLs firmadas, e incluye medicamentos e historial', async () => {
    const detalle: SolicitudDetalle = {
      id: 'solicitud-uuid',
      codigoPedido: 'MR-000123',
      estado: 'borrador',
      recetaPath: 'solicitud/solicitud-uuid/receta.jpg',
      recetaFechaVencimiento: '2026-08-01',
      direccionEntrega: 'Calle 1 #2-3',
      direccionFarmacia: 'Carrera 5 #6-7',
      creadoEn: '2026-08-20T10:00:00.000Z',
      enviadoEn: null,
      canceladoEn: null,
      cedulaPath: 'paciente/usuario-uuid/cedula.jpg',
      codigoEntrega: '8SBM9J',
    };
    const medicamentos: Medicamento[] = [
      {
        nombre: 'Acetaminofén',
        concentracion: '500mg',
        formaFarmaceutica: 'Tableta',
        cantidad: '30 tabletas',
        posologia: 'Cada 8 horas por 7 días',
      },
    ];
    const historial = [
      { estado: 'borrador' as const, creadoEn: '2026-08-20T10:00:00.000Z' },
    ];
    (solicitudes.obtener as jest.Mock).mockResolvedValue(detalle);
    (solicitudes.listarMedicamentos as jest.Mock).mockResolvedValue(
      medicamentos,
    );
    (solicitudes.listarHistorial as jest.Mock).mockResolvedValue(historial);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado.codigoPedido).toBe('MR-000123');
    expect(resultado.codigoEntrega).toBe('8SBM9J');
    expect(resultado.novedadAbierta).toBeNull();
    expect(resultado.recetaUrl).toBe(
      'https://firmada.test/solicitud/solicitud-uuid/receta.jpg',
    );
    expect(resultado.cedulaUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula.jpg',
    );
    expect(resultado.medicamentos).toBe(medicamentos);
    expect(resultado.historial).toBe(historial);
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'solicitud/solicitud-uuid/receta.jpg',
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  });

  it('incluye la novedad abierta cuando el pedido tiene una', async () => {
    (solicitudes.obtener as jest.Mock).mockResolvedValue({
      id: 'solicitud-uuid',
      codigoPedido: 'MR-000123',
      estado: 'asignado_en_camino_farmacia',
      recetaPath: null,
      recetaFechaVencimiento: null,
      direccionEntrega: null,
      direccionFarmacia: null,
      creadoEn: '2026-08-20T10:00:00.000Z',
      enviadoEn: null,
      canceladoEn: null,
      cedulaPath: null,
      codigoEntrega: '8SBM9J',
    });
    (solicitudes.obtenerNovedadAbierta as jest.Mock).mockResolvedValue({
      id: 'novedad-uuid',
      detalle: 'No había uno de los medicamentos',
      creadoEn: '2026-08-20T11:00:00.000Z',
    });

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado.novedadAbierta).toEqual({
      id: 'novedad-uuid',
      detalle: 'No había uno de los medicamentos',
      creadoEn: '2026-08-20T11:00:00.000Z',
    });
  });

  it('recetaUrl/cedulaUrl quedan null si no hay path', async () => {
    (solicitudes.obtener as jest.Mock).mockResolvedValue({
      id: 'solicitud-uuid',
      codigoPedido: null,
      estado: 'borrador',
      recetaPath: null,
      recetaFechaVencimiento: null,
      direccionEntrega: null,
      creadoEn: '2026-08-20T10:00:00.000Z',
      enviadoEn: null,
      canceladoEn: null,
      cedulaPath: null,
      codigoEntrega: null,
    });

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado.recetaUrl).toBeNull();
    expect(resultado.cedulaUrl).toBeNull();
    expect(almacenamiento.obtenerUrlFirmada).not.toHaveBeenCalled();
  });

  it('lanza SolicitudNoEncontradaError si no existe o no es del dueño', async () => {
    (solicitudes.obtener as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
