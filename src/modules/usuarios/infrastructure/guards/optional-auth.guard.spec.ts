import { ExecutionContext } from '@nestjs/common';
import { IDENTIDAD_REQUEST_KEY } from '../../domain/identidad-autenticada';
import { AccessTokenPort } from '../../domain/ports/access-token.port';
import { SesionRepositoryPort } from '../../domain/ports/sesion.repository.port';
import { OptionalAuthGuard } from './optional-auth.guard';

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

describe('OptionalAuthGuard', () => {
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
  const guard = new OptionalAuthGuard(accessTokens, sesiones);

  beforeEach(() => {
    jest.resetAllMocks();
    (accessTokens.verify as jest.Mock).mockResolvedValue({ sub: SUB, sid: SID });
    (sesiones.validar as jest.Mock).mockResolvedValue(true);
  });

  it('deja pasar sin Authorization, sin identidad adjunta', async () => {
    const { context, request } = contextoCon(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[IDENTIDAD_REQUEST_KEY]).toBeUndefined();
    expect(accessTokens.verify).not.toHaveBeenCalled();
  });

  it('deja pasar con un token inválido, sin identidad adjunta (no lanza)', async () => {
    (accessTokens.verify as jest.Mock).mockRejectedValue(new Error('jwt'));
    const { context, request } = contextoCon('Bearer token-malo');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[IDENTIDAD_REQUEST_KEY]).toBeUndefined();
  });

  it('deja pasar con una sesión ya no válida, sin identidad adjunta (no lanza)', async () => {
    (sesiones.validar as jest.Mock).mockResolvedValue(false);
    const { context, request } = contextoCon('Bearer token-firmado');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[IDENTIDAD_REQUEST_KEY]).toBeUndefined();
  });

  it('adjunta la identidad cuando el token es válido', async () => {
    const { context, request } = contextoCon('Bearer token-firmado');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request[IDENTIDAD_REQUEST_KEY]).toEqual({ usuarioId: SUB, sid: SID });
  });
});
