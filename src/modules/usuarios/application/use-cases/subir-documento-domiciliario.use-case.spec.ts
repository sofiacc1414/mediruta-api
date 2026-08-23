import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import { BUCKET_PERFILES } from './subir-foto-cedula-paciente.use-case';
import {
  MENSAJE_DOCUMENTO_ACTUALIZADO,
  SubirDocumentoDomiciliarioUseCase,
} from './subir-documento-domiciliario.use-case';

describe('SubirDocumentoDomiciliarioUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    actualizarFotoPerfil: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
  };
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };

  const useCase = new SubirDocumentoDomiciliarioUseCase(
    perfiles,
    almacenamiento,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.subir as jest.Mock).mockResolvedValue(
      'domiciliario/usuario-uuid/soat.pdf',
    );
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockResolvedValue(
      'https://firmada.test/domiciliario/usuario-uuid/soat.pdf',
    );
  });

  it('G01/G03 — sube el documento a Storage, persiste el path por tipo y devuelve la URL firmada', async () => {
    (perfiles.actualizarDocumentoDomiciliario as jest.Mock).mockResolvedValue(
      true,
    );
    const contenido = Buffer.from('documento');

    const resultado = await useCase.execute({
      usuarioId: 'usuario-uuid',
      tipo: 'soat',
      contenido,
      contentType: 'application/pdf',
      extension: 'pdf',
    });

    expect(almacenamiento.subir).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'domiciliario/usuario-uuid/soat.pdf',
      contenido,
      'application/pdf',
    );
    expect(perfiles.actualizarDocumentoDomiciliario).toHaveBeenCalledWith(
      'usuario-uuid',
      'soat',
      'domiciliario/usuario-uuid/soat.pdf',
    );
    expect(resultado).toEqual({
      message: MENSAJE_DOCUMENTO_ACTUALIZADO,
      url: 'https://firmada.test/domiciliario/usuario-uuid/soat.pdf',
    });
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol DOMICILIARIO', async () => {
    (perfiles.actualizarDocumentoDomiciliario as jest.Mock).mockResolvedValue(
      false,
    );

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        tipo: 'licencia',
        contenido: Buffer.from('documento'),
        contentType: 'image/png',
        extension: 'png',
      }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
