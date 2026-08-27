import { DocumentacionIncompletaError } from '../../../domiciliarios/domain/errors/documentacion-incompleta.error';
import { NoHayBorradorDomiciliarioError } from '../../../domiciliarios/domain/errors/no-hay-borrador-domiciliario.error';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import {
  EnviarSolicitudDomiciliarioUseCase,
  MENSAJE_SOLICITUD_DOMICILIARIO_ENVIADA,
} from './enviar-solicitud-domiciliario.use-case';

describe('EnviarSolicitudDomiciliarioUseCase', () => {
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
  };
  const useCase = new EnviarSolicitudDomiciliarioUseCase(usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01 — envía y devuelve el mensaje de éxito', async () => {
    (usuarios.enviarSolicitudDomiciliario as jest.Mock).mockResolvedValue({
      resultado: 'enviada',
    });

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_SOLICITUD_DOMICILIARIO_ENVIADA });
    expect(usuarios.enviarSolicitudDomiciliario).toHaveBeenCalledWith('usuario-uuid');
  });

  it('lanza DocumentacionIncompletaError con lo que falta', async () => {
    (usuarios.enviarSolicitudDomiciliario as jest.Mock).mockResolvedValue({
      resultado: 'incompleta',
      faltantes: ['Cédula', 'SOAT'],
    });

    const error = await useCase.execute('usuario-uuid').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DocumentacionIncompletaError);
    expect((error as DocumentacionIncompletaError).faltantes).toEqual([
      'Cédula',
      'SOAT',
    ]);
  });

  it('lanza NoHayBorradorDomiciliarioError si no hay solicitud en borrador', async () => {
    (usuarios.enviarSolicitudDomiciliario as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrada',
    });

    await expect(useCase.execute('usuario-uuid')).rejects.toBeInstanceOf(
      NoHayBorradorDomiciliarioError,
    );
  });
});
