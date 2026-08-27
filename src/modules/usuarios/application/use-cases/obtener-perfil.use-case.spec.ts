import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import {
  Perfil,
  PerfilRepositoryPort,
} from '../../domain/ports/perfil.repository.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from './subir-foto-cedula-paciente.use-case';
import { ObtenerPerfilUseCase } from './obtener-perfil.use-case';

describe('ObtenerPerfilUseCase', () => {
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

  const useCase = new ObtenerPerfilUseCase(perfiles, almacenamiento);

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
  });

  it('G02 — sin documentos subidos, no pide ninguna URL firmada', async () => {
    const perfil: Perfil = {
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
      fotoPerfilPath: null,
      paciente: null,
      domiciliario: null,
    };
    (perfiles.obtenerPerfil as jest.Mock).mockResolvedValue(perfil);

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual({
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
      fotoPerfilUrl: null,
      paciente: null,
      domiciliario: null,
    });
    expect(almacenamiento.obtenerUrlFirmada).not.toHaveBeenCalled();
  });

  it('G02 — resuelve una URL firmada por cada documento ya subido', async () => {
    const perfil: Perfil = {
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
      fotoPerfilPath: 'perfil/usuario-uuid/foto.jpg',
      paciente: {
        direccion: 'Calle 123',
        fechaNacimiento: '1990-05-10',
        fotoCedulaFrentePath: 'paciente/usuario-uuid/cedula_frente.jpg',
        fotoCedulaReversoPath: 'paciente/usuario-uuid/cedula_reverso.jpg',
        departamento: 'Cundinamarca',
        ciudad: 'Bogotá',
      },
      domiciliario: {
        direccion: 'Avenida 45',
        vehiculoTipo: 'Moto',
        vehiculoPlaca: 'ABC123',
        cedulaFrentePath: 'domiciliario/usuario-uuid/cedula_frente.jpg',
        cedulaReversoPath: 'domiciliario/usuario-uuid/cedula_reverso.jpg',
        licenciaPath: null,
        soatPath: null,
        tecnicomecanicaPath: null,
      },
    };
    (perfiles.obtenerPerfil as jest.Mock).mockResolvedValue(perfil);

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado.fotoPerfilUrl).toBe(
      'https://firmada.test/perfil/usuario-uuid/foto.jpg',
    );
    expect(resultado.paciente?.fotoCedulaFrenteUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula_frente.jpg',
    );
    expect(resultado.paciente?.fotoCedulaReversoUrl).toBe(
      'https://firmada.test/paciente/usuario-uuid/cedula_reverso.jpg',
    );
    expect(resultado.domiciliario?.cedulaFrenteUrl).toBe(
      'https://firmada.test/domiciliario/usuario-uuid/cedula_frente.jpg',
    );
    expect(resultado.domiciliario?.cedulaReversoUrl).toBe(
      'https://firmada.test/domiciliario/usuario-uuid/cedula_reverso.jpg',
    );
    expect(resultado.domiciliario?.licenciaUrl).toBeNull();
    expect(resultado.paciente?.departamento).toBe('Cundinamarca');
    expect(resultado.paciente?.ciudad).toBe('Bogotá');
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'perfil/usuario-uuid/foto.jpg',
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  });

  it('lanza NoAutorizadoError si la cuenta no existe o no está activa', async () => {
    (perfiles.obtenerPerfil as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('usuario-uuid')).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });

  it('las URLs quedan null (no revienta con 500) si Storage no puede firmar la URL', async () => {
    const perfil: Perfil = {
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
      fotoPerfilPath: 'fake/foto.jpg',
      paciente: null,
      domiciliario: null,
    };
    (perfiles.obtenerPerfil as jest.Mock).mockResolvedValue(perfil);
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockRejectedValue(
      new Error('Object not found'),
    );

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado.fotoPerfilUrl).toBeNull();
  });
});
