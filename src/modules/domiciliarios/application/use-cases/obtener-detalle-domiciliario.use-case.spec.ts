import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from '../../../usuarios/application/use-cases/subir-foto-cedula-paciente.use-case';
import { DomiciliarioNoEncontradoError } from '../../domain/errors/domiciliario-no-encontrado.error';
import {
  PerfilDomiciliarioValidacion,
  ValidacionDomiciliarioRepositoryPort,
} from '../../domain/ports/validacion-domiciliario.repository.port';
import { ObtenerDetalleDomiciliarioUseCase } from './obtener-detalle-domiciliario.use-case';

describe('ObtenerDetalleDomiciliarioUseCase', () => {
  const validaciones: ValidacionDomiciliarioRepositoryPort = {
    listarPendientes: jest.fn(),
    obtenerDetalle: jest.fn(),
    listarHistorial: jest.fn(),
    aprobar: jest.fn(),
    rechazar: jest.fn(),
  };
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const useCase = new ObtenerDetalleDomiciliarioUseCase(
    validaciones,
    almacenamiento,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
    (validaciones.listarHistorial as jest.Mock).mockResolvedValue([]);
  });

  it('G02 — resuelve una URL firmada por cada documento subido', async () => {
    const detalle: PerfilDomiciliarioValidacion = {
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
      estado: 'pendiente_validacion',
      solicitadoEn: '2026-08-20T10:00:00.000Z',
      direccion: 'Avenida 45',
      vehiculoTipo: 'Moto',
      vehiculoPlaca: 'ABC123',
      cedulaPath: 'domiciliario/usuario-uuid/cedula.jpg',
      licenciaPath: null,
      soatPath: null,
      tecnicomecanicaPath: null,
    };
    (validaciones.obtenerDetalle as jest.Mock).mockResolvedValue(detalle);

    const resultado = await useCase.execute('admin-uuid', 'usuario-uuid');

    expect(resultado.cedulaUrl).toBe(
      'https://firmada.test/domiciliario/usuario-uuid/cedula.jpg',
    );
    expect(resultado.licenciaUrl).toBeNull();
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'domiciliario/usuario-uuid/cedula.jpg',
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
    expect(validaciones.obtenerDetalle).toHaveBeenCalledWith(
      'admin-uuid',
      'usuario-uuid',
    );
  });

  it('G06 — incluye el historial de decisiones', async () => {
    (validaciones.obtenerDetalle as jest.Mock).mockResolvedValue({
      nombreCompleto: null,
      telefono: null,
      estado: 'rechazado',
      solicitadoEn: '2026-08-20T10:00:00.000Z',
      direccion: null,
      vehiculoTipo: null,
      vehiculoPlaca: null,
      cedulaPath: null,
      licenciaPath: null,
      soatPath: null,
      tecnicomecanicaPath: null,
    });
    const historial = [
      {
        decision: 'rechazado' as const,
        motivo: 'Falta SOAT',
        creadoEn: '2026-08-21T10:00:00.000Z',
        adminCorreo: 'root@mediruta.test',
      },
    ];
    (validaciones.listarHistorial as jest.Mock).mockResolvedValue(historial);

    const resultado = await useCase.execute('admin-uuid', 'usuario-uuid');

    expect(resultado.historial).toBe(historial);
  });

  it('lanza DomiciliarioNoEncontradoError si no hay detalle', async () => {
    (validaciones.obtenerDetalle as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('admin-uuid', 'usuario-uuid'),
    ).rejects.toBeInstanceOf(DomiciliarioNoEncontradoError);
  });
});
