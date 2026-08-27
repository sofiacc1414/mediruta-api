import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { DocumentosPacienteNoDisponiblesError } from '../../domain/errors/documentos-paciente-no-disponibles.error';
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
  };
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const useCase = new ObtenerDocumentosPacienteParaRecogerUseCase(
    solicitudes,
    almacenamiento,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
  });

  it('resuelve URLs firmadas para ambos lados de la cédula', async () => {
    (
      solicitudes.obtenerDocumentosPacienteParaRecoger as jest.Mock
    ).mockResolvedValue({
      cedulaFrentePath: 'paciente/usuario-uuid/cedula_frente.jpg',
      cedulaReversoPath: 'paciente/usuario-uuid/cedula_reverso.jpg',
    });

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
    );

    expect(resultado.cedulaFrenteUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula_frente.jpg',
    );
    expect(resultado.cedulaReversoUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula_reverso.jpg',
    );
    expect(
      solicitudes.obtenerDocumentosPacienteParaRecoger,
    ).toHaveBeenCalledWith('domiciliario-uuid', 'solicitud-uuid');
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'paciente/usuario-uuid/cedula_frente.jpg',
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  });

  it('lanza DocumentosPacienteNoDisponiblesError fuera de la ventana permitida', async () => {
    (
      solicitudes.obtenerDocumentosPacienteParaRecoger as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute('domiciliario-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(DocumentosPacienteNoDisponiblesError);
  });

  it('las URLs quedan null (no revienta con 500) si Storage no puede firmar la URL', async () => {
    (
      solicitudes.obtenerDocumentosPacienteParaRecoger as jest.Mock
    ).mockResolvedValue({
      cedulaFrentePath: 'fake/cedula_frente.jpg',
      cedulaReversoPath: 'fake/cedula_reverso.jpg',
    });
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockRejectedValue(
      new Error('Object not found'),
    );

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      'solicitud-uuid',
    );

    expect(resultado.cedulaFrenteUrl).toBeNull();
    expect(resultado.cedulaReversoUrl).toBeNull();
  });
});
