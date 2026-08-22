import { RefreshTokenInvalidoError } from '../../domain/errors/refresh-token-invalido.error';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { RefreshTokenPort } from '../../domain/ports/refresh-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';
import { RefrescarSesionUseCase } from './refrescar-sesion.use-case';

describe('RefrescarSesionUseCase', () => {
  const refreshTokens: RefreshTokenPort = {
    generar: jest.fn(),
    hash: jest.fn(),
  };
  const sesiones: SesionRepositoryPort = {
    crear: jest.fn(),
    rotar: jest.fn(),
    validar: jest.fn(),
  };
  const accessTokens: AccessTokenPort = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const useCase = new RefrescarSesionUseCase(
    refreshTokens,
    sesiones,
    accessTokens,
  );

  const expiraEn = new Date('2026-08-29T00:00:00.000Z');

  beforeEach(() => {
    jest.resetAllMocks();
    (refreshTokens.hash as jest.Mock).mockReturnValue('hash-actual');
    (refreshTokens.generar as jest.Mock).mockReturnValue({
      token: 'refresh-nuevo',
      hash: 'hash-nuevo',
      expiraEn,
    });
    (sesiones.rotar as jest.Mock).mockResolvedValue({
      usuarioId: 'usuario-uuid',
      sid: 'sid-nuevo',
    });
    (accessTokens.sign as jest.Mock).mockResolvedValue('access-jwt');
  });

  it('rota la sesión y retorna accessToken + refreshToken nuevo', async () => {
    const resultado = await useCase.execute({
      refreshToken: 'refresh-actual',
      userAgent: 'MediRuta/1.0',
      ip: '127.0.0.1',
    });

    expect(refreshTokens.hash).toHaveBeenCalledWith('refresh-actual');
    expect(refreshTokens.generar).toHaveBeenCalled();
    expect(sesiones.rotar).toHaveBeenCalledWith({
      refreshTokenHashActual: 'hash-actual',
      nuevoRefreshTokenHash: 'hash-nuevo',
      nuevaExpiraEn: expiraEn,
      userAgent: 'MediRuta/1.0',
      ip: '127.0.0.1',
    });
    expect(accessTokens.sign).toHaveBeenCalledWith({
      sub: 'usuario-uuid',
      sid: 'sid-nuevo',
    });
    expect(resultado).toEqual({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-nuevo',
    });
    expect(resultado).not.toHaveProperty('sid');
    expect(JSON.stringify(resultado)).not.toContain('hash-actual');
    expect(JSON.stringify(resultado)).not.toContain('hash-nuevo');
  });

  it('si rotar devuelve null lanza error genérico y no entrega el token nuevo', async () => {
    (sesiones.rotar as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'refresh-invalido' }),
    ).rejects.toBeInstanceOf(RefreshTokenInvalidoError);

    expect(accessTokens.sign).not.toHaveBeenCalled();
  });

  it('trata un refresh ya usado o revocado como el mismo error genérico', async () => {
    (sesiones.rotar as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'refresh-viejo' }),
    ).rejects.toMatchObject({
      name: 'RefreshTokenInvalidoError',
      message: 'La sesión no es válida o ha expirado.',
    });
  });

  it('trata cuenta bloqueada o sesión expirada (rotar = null) como el mismo error', async () => {
    (sesiones.rotar as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'refresh-de-cuenta-bloqueada' }),
    ).rejects.toBeInstanceOf(RefreshTokenInvalidoError);
  });
});
