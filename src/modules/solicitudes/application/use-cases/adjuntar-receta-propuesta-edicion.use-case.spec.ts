import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  AdjuntarRecetaPropuestaEdicionUseCase,
  MENSAJE_RECETA_PROPUESTA_ADJUNTADA,
} from './adjuntar-receta-propuesta-edicion.use-case';

describe('AdjuntarRecetaPropuestaEdicionUseCase', () => {
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
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const useCase = new AdjuntarRecetaPropuestaEdicionUseCase(
    solicitudes,
    almacenamiento,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockResolvedValue(
      'https://firmada.test/receta_propuesta.jpg',
    );
  });

  it('sube la foto a un path _propuesta aparte y actualiza la novedad', async () => {
    (solicitudes.adjuntarRecetaPropuestaEdicion as jest.Mock).mockResolvedValue(
      true,
    );

    const resultado = await useCase.execute({
      pacienteId: 'paciente-uuid',
      solicitudId: 'solicitud-uuid',
      novedadId: 'novedad-uuid',
      contenido: Buffer.from('contenido'),
      contentType: 'image/jpeg',
      extension: 'jpg',
    });

    expect(resultado).toEqual({
      message: MENSAJE_RECETA_PROPUESTA_ADJUNTADA,
      url: 'https://firmada.test/receta_propuesta.jpg',
    });
    expect(almacenamiento.subir).toHaveBeenCalledWith(
      'perfiles',
      'solicitud/solicitud-uuid/receta_propuesta.jpg',
      Buffer.from('contenido'),
      'image/jpeg',
    );
    expect(solicitudes.adjuntarRecetaPropuestaEdicion).toHaveBeenCalledWith(
      'paciente-uuid',
      'novedad-uuid',
      'solicitud/solicitud-uuid/receta_propuesta.jpg',
    );
  });

  it('lanza NovedadNoEncontradaError si la novedad no existe, no es del paciente o ya se resolvió', async () => {
    (solicitudes.adjuntarRecetaPropuestaEdicion as jest.Mock).mockResolvedValue(
      false,
    );

    await expect(
      useCase.execute({
        pacienteId: 'paciente-uuid',
        solicitudId: 'solicitud-uuid',
        novedadId: 'novedad-uuid',
        contenido: Buffer.from('contenido'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      }),
    ).rejects.toBeInstanceOf(NovedadNoEncontradaError);
  });
});
