import { CuentaNoEncontradaError } from '../../domain/errors/cuenta-no-encontrada.error';
import { AlmacenamientoArchivosPort } from '../../domain/ports/almacenamiento-archivos.port';
import {
  CuentaAdminDetalle,
  UsuarioRepositoryPort,
} from '../../domain/ports/usuario.repository.port';
import { ObtenerCuentaAdminUseCase } from './obtener-cuenta-admin.use-case';

describe('ObtenerCuentaAdminUseCase', () => {
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
  const useCase = new ObtenerCuentaAdminUseCase(usuarios, almacenamiento);

  const base: CuentaAdminDetalle = {
    id: 'usuario-uuid',
    correo: 'paciente@mail.com',
    nombreCompleto: 'Persona de Prueba',
    telefono: '3001234567',
    estadoCuenta: 'activa',
    creadoEn: '2026-08-20T10:00:00.000Z',
    roles: ['PACIENTE'],
    fotoPerfilPath: null,
    pacDireccion: 'Calle 1 #2-3',
    pacFotoCedulaFrentePath: 'paciente/uuid/cedula_frente.jpg',
    pacFotoCedulaReversoPath: null,
    domDireccion: null,
    domVehiculoTipo: null,
    domVehiculoPlaca: null,
    domCedulaFrentePath: null,
    domCedulaReversoPath: null,
    domLicenciaPath: null,
    domSoatPath: null,
    domTecnicomecanicaPath: null,
    domDisponible: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (almacenamiento.obtenerUrlFirmada as jest.Mock).mockImplementation(
      (_bucket: string, path: string) =>
        Promise.resolve(`https://firmada.test/${path}`),
    );
  });

  it('arma el bloque "paciente" y deja "domiciliario" en null si no tiene ese rol', async () => {
    (usuarios.obtenerCuentaAdmin as jest.Mock).mockResolvedValue(base);

    const resultado = await useCase.execute('admin-uuid', 'usuario-uuid');

    expect(resultado.paciente).toEqual({
      direccion: 'Calle 1 #2-3',
      cedulaFrenteUrl: 'https://firmada.test/paciente/uuid/cedula_frente.jpg',
      cedulaReversoUrl: null,
    });
    expect(resultado.domiciliario).toBeNull();
  });

  it('arma el bloque "domiciliario" cuando tiene ese rol', async () => {
    (usuarios.obtenerCuentaAdmin as jest.Mock).mockResolvedValue({
      ...base,
      roles: ['DOMICILIARIO'],
      pacDireccion: null,
      pacFotoCedulaFrentePath: null,
      domDireccion: 'Calle 9 #10-11',
      domVehiculoTipo: 'moto',
      domVehiculoPlaca: 'ABC123',
      domDisponible: true,
    });

    const resultado = await useCase.execute('admin-uuid', 'usuario-uuid');

    expect(resultado.paciente).toBeNull();
    expect(resultado.domiciliario).toMatchObject({
      direccion: 'Calle 9 #10-11',
      vehiculoTipo: 'moto',
      vehiculoPlaca: 'ABC123',
      disponible: true,
    });
  });

  it('lanza CuentaNoEncontradaError si no existe', async () => {
    (usuarios.obtenerCuentaAdmin as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('admin-uuid', 'usuario-uuid'),
    ).rejects.toBeInstanceOf(CuentaNoEncontradaError);
  });
});
