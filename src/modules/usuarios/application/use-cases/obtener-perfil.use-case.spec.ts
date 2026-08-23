import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import {
  Perfil,
  PerfilRepositoryPort,
} from '../../domain/ports/perfil.repository.port';
import { ObtenerPerfilUseCase } from './obtener-perfil.use-case';

describe('ObtenerPerfilUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
  };

  const useCase = new ObtenerPerfilUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G02 — devuelve el perfil del repositorio', async () => {
    const perfil: Perfil = {
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
      paciente: null,
      domiciliario: null,
    };
    (perfiles.obtenerPerfil as jest.Mock).mockResolvedValue(perfil);

    const resultado = await useCase.execute('usuario-uuid');

    expect(perfiles.obtenerPerfil).toHaveBeenCalledWith('usuario-uuid');
    expect(resultado).toBe(perfil);
  });

  it('lanza NoAutorizadoError si la cuenta no existe o no está activa', async () => {
    (perfiles.obtenerPerfil as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('usuario-uuid')).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });
});
