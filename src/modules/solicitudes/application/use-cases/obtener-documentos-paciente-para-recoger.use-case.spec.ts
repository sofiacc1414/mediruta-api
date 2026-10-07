import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { BUCKET_PERFILES } from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { DocumentosPacienteNoDisponiblesError } from '../../domain/errors/documentos-paciente-no-disponibles.error';
import { ACCESO_TEMPORAL_SEGUNDOS } from '../../domain/geocerca-acceso';
import { AccesoTemporalRepositoryPort } from '../../domain/ports/acceso-temporal.repository.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ObtenerDocumentosPacienteParaRecogerUseCase } from './obtener-documentos-paciente-para-recoger.use-case';

describe('ObtenerDocumentosPacienteParaRecogerUseCase', () => {
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
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const accesos: AccesoTemporalRepositoryPort = {
    puntoFarmacia: jest.fn(),
    registrar: jest.fn(),
    revocarPorPedido: jest.fn(),
  };
  const useCase = new ObtenerDocumentosPacienteParaRecogerUseCase(
    solicitudes,
    almacenamiento,
    accesos,
  );

  const enFarmacia = () => {
    (accesos.puntoFarmacia as jest.Mock).mockResolvedValue({
      estado: 'en_farmacia',
      farmaciaLat: 6.244,
      farmaciaLng: -75.581,
    });
    (accesos.registrar as jest.Mock).mockResolvedValue(undefined);
    (accesos.revocarPorPedido as jest.Mock).mockResolvedValue(undefined);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
  });

  it('resuelve URLs firmadas para ambos lados de la cédula y la fórmula médica', async () => {
    enFarmacia();
    (
      solicitudes.obtenerDocumentosPacienteParaRecoger as jest.Mock
    ).mockResolvedValue({
      cedulaFrentePath: 'paciente/usuario-uuid/cedula_frente.jpg',
      cedulaReversoPath: 'paciente/usuario-uuid/cedula_reverso.jpg',
      recetaPath: 'solicitud/solicitud-uuid/receta.jpg',
    });

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
      6.244,
      -75.581,
    );

    expect(resultado.cedulaFrenteUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula_frente.jpg',
    );
    expect(resultado.cedulaReversoUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula_reverso.jpg',
    );
    expect(resultado.recetaUrl).toBe(
      'https://firmada.test/solicitud/solicitud-uuid/receta.jpg',
    );
    expect(
      solicitudes.obtenerDocumentosPacienteParaRecoger,
    ).toHaveBeenCalledWith('domiciliario-uuid', 'solicitud-uuid');
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'paciente/usuario-uuid/cedula_frente.jpg',
      ACCESO_TEMPORAL_SEGUNDOS,
    );
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'solicitud/solicitud-uuid/receta.jpg',
      ACCESO_TEMPORAL_SEGUNDOS,
    );
  });

  it('lanza DocumentosPacienteNoDisponiblesError fuera de la ventana permitida', async () => {
    (accesos.puntoFarmacia as jest.Mock).mockResolvedValue({
      estado: 'en_camino_entrega',
      farmaciaLat: 6.244,
      farmaciaLng: -75.581,
    });
    (accesos.registrar as jest.Mock).mockResolvedValue(undefined);
    (accesos.revocarPorPedido as jest.Mock).mockResolvedValue(undefined);

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(DocumentosPacienteNoDisponiblesError);
  });

  it('las URLs quedan null (no revienta con 500) si Storage no puede firmar la URL', async () => {
    enFarmacia();
    (
      solicitudes.obtenerDocumentosPacienteParaRecoger as jest.Mock
    ).mockResolvedValue({
      cedulaFrentePath: 'fake/cedula_frente.jpg',
      cedulaReversoPath: 'fake/cedula_reverso.jpg',
      recetaPath: 'fake/receta.jpg',
    });
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockRejectedValue(
      new Error('Object not found'),
    );

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
      6.244,
      -75.581,
    );

    expect(resultado.cedulaFrenteUrl).toBeNull();
    expect(resultado.cedulaReversoUrl).toBeNull();
    expect(resultado.recetaUrl).toBeNull();
  });
});
