import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenAdapter } from './jwt-access-token.adapter';

function decodificarPayload(token: string): Record<string, unknown> {
  const segmento = token.split('.')[1];
  return JSON.parse(Buffer.from(segmento, 'base64url').toString('utf8'));
}

describe('JwtAccessTokenAdapter', () => {
  it('firma un JWT cuyo payload solo contiene sub, sid, iat y exp', async () => {
    const jwt = new JwtService({
      secret: 'test-secret',
      signOptions: { expiresIn: '15m' },
    });
    const adapter = new JwtAccessTokenAdapter(jwt);

    const token = await adapter.sign({
      sub: 'usuario-uuid',
      sid: 'sid-uuid',
    });
    const payload = decodificarPayload(token);

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sid', 'sub']);
    expect(payload.sub).toBe('usuario-uuid');
    expect(payload.sid).toBe('sid-uuid');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload).not.toHaveProperty('roles');
    expect(payload).not.toHaveProperty('correo');
    expect(payload).not.toHaveProperty('estadoCuenta');
  });
});
