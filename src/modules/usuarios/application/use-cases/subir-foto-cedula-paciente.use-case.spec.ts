import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  BUCKET_PERFILES,
  MENSAJE_FOTO_CEDULA_ACTUALIZADA,
  SubirFotoCedulaPacienteUseCase,
} from './subir-foto-cedula-paciente.use-case';

describe('SubirFotoCedulaPacienteUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    actualizarFotoPerfil: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
    actualizarDisponibilidadDomiciliario: jest.fn(),
  };
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };

  const useCase = new SubirFotoCedulaPacienteUseCase(perfiles, almacenamiento);

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.subir as jest.Mock).mockResolvedValue(
      'paciente/usuario-uuid/cedula_frente.jpg',
    );
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockResolvedValue(
      'https://firmada.test/paciente/usuario-uuid/cedula_frente.jpg',
    );
  });

  it('G01/G03 — sube el archivo a Storage, persiste el path (con el lado) y devuelve la URL firmada', async () => {
    (perfiles.actualizarFotoCedulaPaciente as jest.Mock).mockResolvedValue(
      true,
    );
    const contenido = Buffer.from('foto');

    const resultado = await useCase.execute({
      usuarioId: 'usuario-uuid',
      lado: 'frente',
      contenido,
      contentType: 'image/jpeg',
      extension: 'jpg',
    });

    expect(almacenamiento.subir).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'paciente/usuario-uuid/cedula_frente.jpg',
      contenido,
      'image/jpeg',
    );
    expect(perfiles.actualizarFotoCedulaPaciente).toHaveBeenCalledWith(
      'usuario-uuid',
      'frente',
      'paciente/usuario-uuid/cedula_frente.jpg',
    );
    expect(resultado).toEqual({
      message: MENSAJE_FOTO_CEDULA_ACTUALIZADA,
      url: 'https://firmada.test/paciente/usuario-uuid/cedula_frente.jpg',
    });
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol PACIENTE', async () => {
    (perfiles.actualizarFotoCedulaPaciente as jest.Mock).mockResolvedValue(
      false,
    );

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        lado: 'reverso',
        contenido: Buffer.from('foto'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
