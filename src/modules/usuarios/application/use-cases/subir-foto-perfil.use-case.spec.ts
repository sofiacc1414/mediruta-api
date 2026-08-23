import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import { BUCKET_PERFILES } from './subir-foto-cedula-paciente.use-case';
import {
  MENSAJE_FOTO_PERFIL_ACTUALIZADA,
  SubirFotoPerfilUseCase,
} from './subir-foto-perfil.use-case';

describe('SubirFotoPerfilUseCase', () => {
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

  const useCase = new SubirFotoPerfilUseCase(perfiles, almacenamiento);

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.subir as jest.Mock).mockResolvedValue(
      'perfil/usuario-uuid/foto.jpg',
    );
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockResolvedValue(
      'https://firmada.test/perfil/usuario-uuid/foto.jpg',
    );
  });

  it('sube la foto a Storage, persiste el path y devuelve la URL firmada', async () => {
    (perfiles.actualizarFotoPerfil as jest.Mock).mockResolvedValue(true);
    const contenido = Buffer.from('foto');

    const resultado = await useCase.execute({
      usuarioId: 'usuario-uuid',
      contenido,
      contentType: 'image/jpeg',
      extension: 'jpg',
    });

    expect(almacenamiento.subir).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'perfil/usuario-uuid/foto.jpg',
      contenido,
      'image/jpeg',
    );
    expect(perfiles.actualizarFotoPerfil).toHaveBeenCalledWith(
      'usuario-uuid',
      'perfil/usuario-uuid/foto.jpg',
    );
    expect(resultado).toEqual({
      message: MENSAJE_FOTO_PERFIL_ACTUALIZADA,
      url: 'https://firmada.test/perfil/usuario-uuid/foto.jpg',
    });
  });

  it('lanza NoAutorizadoError si la cuenta no está activa', async () => {
    (perfiles.actualizarFotoPerfil as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        contenido: Buffer.from('foto'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      }),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
  });
});
