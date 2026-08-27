import { AdministradorNoEncontradoError } from '../../domain/errors/administrador-no-encontrado.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  BUCKET_PERFILES,
  URL_FIRMADA_EXPIRA_SEGUNDOS,
} from './subir-foto-cedula-paciente.use-case';
import { ObtenerAdministradorUseCase } from './obtener-administrador.use-case';

describe('ObtenerAdministradorUseCase', () => {
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerCuentaActual: jest.fn(),
    obtenerRoles: jest.fn(),
    solicitarRolPaciente: jest.fn(),
    solicitarRolDomiciliario: jest.fn(),
    enviarSolicitudDomiciliario: jest.fn(),
    crearAdministrador: jest.fn(),
    listarAdministradores: jest.fn(),
    obtenerAdministrador: jest.fn(),
    listarCuentasAdmin: jest.fn(),
    obtenerCuentaAdmin: jest.fn(),
    bloquearCuenta: jest.fn(),
    desbloquearCuenta: jest.fn(),
  };
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn(),
  };
  const useCase = new ObtenerAdministradorUseCase(usuarios, almacenamiento);

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
  });

  it('resuelve la foto de perfil a una URL firmada', async () => {
    (usuarios.obtenerAdministrador as jest.Mock).mockResolvedValue({
      id: 'admin-uuid',
      correo: 'admin@mail.com',
      nombreCompleto: 'Ana Admin',
      telefono: '3001234567',
      estadoCuenta: 'activa',
      fotoPerfilPath: 'perfil/admin-uuid/foto.jpg',
      creadoEn: '2026-08-20T10:00:00.000Z',
    });

    const resultado = await useCase.execute('root-uuid', 'admin-uuid');

    expect(resultado.fotoPerfilUrl).toBe(
      'https://firmada.test/perfil/admin-uuid/foto.jpg',
    );
    expect(almacenamiento.obtenerUrlFirmada).toHaveBeenCalledWith(
      BUCKET_PERFILES,
      'perfil/admin-uuid/foto.jpg',
      URL_FIRMADA_EXPIRA_SEGUNDOS,
    );
  });

  it('fotoPerfilUrl queda null si no hay path', async () => {
    (usuarios.obtenerAdministrador as jest.Mock).mockResolvedValue({
      id: 'admin-uuid',
      correo: 'admin@mail.com',
      nombreCompleto: null,
      telefono: null,
      estadoCuenta: 'activa',
      fotoPerfilPath: null,
      creadoEn: '2026-08-20T10:00:00.000Z',
    });

    const resultado = await useCase.execute('root-uuid', 'admin-uuid');

    expect(resultado.fotoPerfilUrl).toBeNull();
    expect(almacenamiento.obtenerUrlFirmada).not.toHaveBeenCalled();
  });

  it('lanza AdministradorNoEncontradoError si no existe', async () => {
    (usuarios.obtenerAdministrador as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('root-uuid', 'admin-uuid'),
    ).rejects.toBeInstanceOf(AdministradorNoEncontradoError);
  });
});
