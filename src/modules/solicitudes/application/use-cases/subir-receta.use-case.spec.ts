import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_RECETA_ACTUALIZADA,
  SubirRecetaUseCase,
} from './subir-receta.use-case';

describe('SubirRecetaUseCase', () => {
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
  const useCase = new SubirRecetaUseCase(solicitudes, almacenamiento);

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockResolvedValue(
      'https://firmada.test/receta.jpg',
    );
  });

  it('sube el archivo, persiste el path y devuelve la URL firmada', async () => {
    (solicitudes.actualizarReceta as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute({
      pacienteId: 'paciente-uuid',
      solicitudId: 'solicitud-uuid',
      contenido: Buffer.from('contenido'),
      contentType: 'image/jpeg',
      extension: 'jpg',
    });

    expect(resultado).toEqual({
      message: MENSAJE_RECETA_ACTUALIZADA,
      url: 'https://firmada.test/receta.jpg',
    });
    expect(almacenamiento.subir).toHaveBeenCalledWith(
      'perfiles',
      'solicitud/solicitud-uuid/receta.jpg',
      Buffer.from('contenido'),
      'image/jpeg',
    );
    expect(solicitudes.actualizarReceta).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      'solicitud/solicitud-uuid/receta.jpg',
    );
  });

  it('lanza SolicitudNoEncontradaError si ya no está en Borrador o no es del dueño', async () => {
    (solicitudes.actualizarReceta as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        pacienteId: 'paciente-uuid',
        solicitudId: 'solicitud-uuid',
        contenido: Buffer.from('contenido'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      }),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
