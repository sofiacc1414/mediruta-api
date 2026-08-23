import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import { DesactivarCuentaUseCase } from './desactivar-cuenta.use-case';

describe('DesactivarCuentaUseCase', () => {
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

  const useCase = new DesactivarCuentaUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G05 — desactiva la cuenta usando la identidad de la sesión actual', async () => {
    (perfiles.desactivarCuenta as jest.Mock).mockResolvedValue(true);

    await expect(
      useCase.execute({ usuarioId: 'usuario-uuid', sid: 'sid-uuid' }),
    ).resolves.toBeUndefined();

    expect(perfiles.desactivarCuenta).toHaveBeenCalledWith(
      'usuario-uuid',
      'sid-uuid',
    );
  });

  it('lanza NoAutorizadoError si la sesión ya no es válida', async () => {
    (perfiles.desactivarCuenta as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({ usuarioId: 'usuario-uuid', sid: 'sid-uuid' }),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
  });
});
