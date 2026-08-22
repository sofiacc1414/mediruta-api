import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';
import { CerrarSesionUseCase } from './cerrar-sesion.use-case';

describe('CerrarSesionUseCase', () => {
  const sesiones: SesionRepositoryPort = {
    crear: jest.fn(),
    rotar: jest.fn(),
    validar: jest.fn(),
    revocar: jest.fn(),
  };
  const useCase = new CerrarSesionUseCase(sesiones);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('revoca exactamente la sesión de la identidad autenticada', async () => {
    (sesiones.revocar as jest.Mock).mockResolvedValue(true);

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        sid: 'sid-uuid',
      }),
    ).resolves.toBeUndefined();

    expect(sesiones.revocar).toHaveBeenCalledTimes(1);
    expect(sesiones.revocar).toHaveBeenCalledWith({
      usuarioId: 'usuario-uuid',
      sid: 'sid-uuid',
    });
  });

  it('termina correctamente si revocar devuelve false por una carrera', async () => {
    (sesiones.revocar as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        usuarioId: 'usuario-uuid',
        sid: 'sid-ya-revocado',
      }),
    ).resolves.toBeUndefined();

    expect(sesiones.revocar).toHaveBeenCalledTimes(1);
  });
});
