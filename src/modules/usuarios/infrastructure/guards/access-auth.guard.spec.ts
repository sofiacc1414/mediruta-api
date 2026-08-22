import { ExecutionContext } from '@nestjs/common';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { IDENTIDAD_REQUEST_KEY } from '../../domain/identidad-autenticada';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';
import { AccessAuthGuard } from './access-auth.guard';

const SUB = '11111111-1111-4111-8111-111111111111';
const SID = '22222222-2222-4222-8222-222222222222';

function contextoCon(authorization?: string) {
  const request: {
    headers: { authorization?: string };
    [IDENTIDAD_REQUEST_KEY]?: { usuarioId: string; sid: string };
  } = {
    headers: { authorization },
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('AccessAuthGuard', () => {
  const accessTokens: AccessTokenPort = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const sesiones: SesionRepositoryPort = {
    crear: jest.fn(),
    rotar: jest.fn(),
    validar: jest.fn(),
    revocar: jest.fn(),
  };
  const guard = new AccessAuthGuard(accessTokens, sesiones);

  beforeEach(() => {
    jest.resetAllMocks();
    (accessTokens.verify as jest.Mock).mockResolvedValue({
      sub: SUB,
      sid: SID,
    });
    (sesiones.validar as jest.Mock).mockResolvedValue(true);
  });

  it('rechaza Authorization ausente con el mismo 401 genérico', async () => {
    const { context } = contextoCon(undefined);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      name: 'NoAutorizadoError',
      message: 'No autorizado.',
    });
    expect(accessTokens.verify).not.toHaveBeenCalled();
  });

  it('rechaza un esquema que no es Bearer', async () => {
    const { context } = contextoCon('Basic abc');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });

  it('rechaza Bearer vacío', async () => {
    const { context } = contextoCon('Bearer ');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });

  it('rechaza si verify falla', async () => {
    (accessTokens.verify as jest.Mock).mockRejectedValue(new Error('jwt'));
    const { context } = contextoCon('Bearer token-firmado');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      message: 'No autorizado.',
    });
    expect(sesiones.validar).not.toHaveBeenCalled();
  });

  it('rechaza si la sesión no es válida', async () => {
    (sesiones.validar as jest.Mock).mockResolvedValue(false);
    const { context } = contextoCon('Bearer token-firmado');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });

  it('adjunta usuarioId y sid a la request cuando todo es válido', async () => {
    const { context, request } = contextoCon('Bearer token-firmado');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(accessTokens.verify).toHaveBeenCalledWith('token-firmado');
    expect(sesiones.validar).toHaveBeenCalledWith({
      usuarioId: SUB,
      sid: SID,
    });
    expect(request[IDENTIDAD_REQUEST_KEY]).toEqual({
      usuarioId: SUB,
      sid: SID,
    });
  });
});
