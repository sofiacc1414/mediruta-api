import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { JwtAccessTokenAdapter } from './jwt-access-token.adapter';

const SUB = '11111111-1111-4111-8111-111111111111';
const SID = '22222222-2222-4222-8222-222222222222';

function decodificarPayload(token: string): Record<string, unknown> {
  const segmento = token.split('.')[1];
  return JSON.parse(Buffer.from(segmento, 'base64url').toString('utf8'));
}

function adapterCon(secret = 'test-secret', expiresIn: StringValue = '15m') {
  const jwt = new JwtService({
    secret,
    signOptions: { expiresIn },
  });
  return { jwt, adapter: new JwtAccessTokenAdapter(jwt) };
}

describe('JwtAccessTokenAdapter', () => {
  it('firma un JWT cuyo payload solo contiene sub, sid, iat y exp', async () => {
    const { adapter } = adapterCon();
    const token = await adapter.sign({ sub: SUB, sid: SID });
    const payload = decodificarPayload(token);

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sid', 'sub']);
    expect(payload.sub).toBe(SUB);
    expect(payload.sid).toBe(SID);
    expect(payload).not.toHaveProperty('roles');
  });

  it('verify de un token válido retorna solo sub y sid', async () => {
    const { adapter } = adapterCon();
    const token = await adapter.sign({ sub: SUB, sid: SID });

    await expect(adapter.verify(token)).resolves.toEqual({
      sub: SUB,
      sid: SID,
    });
  });

  it('rechaza una firma inválida', async () => {
    const emisor = adapterCon('secreto-a');
    const verificador = adapterCon('secreto-b');
    const token = await emisor.adapter.sign({ sub: SUB, sid: SID });

    await expect(verificador.adapter.verify(token)).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
  });

  it('rechaza un token expirado sin consultar la sesión', async () => {
    const { adapter } = adapterCon('test-secret', '0s');
    const token = await adapter.sign({ sub: SUB, sid: SID });

    await expect(adapter.verify(token)).rejects.toBeInstanceOf(NoAutorizadoError);
  });

  it('rechaza un payload sin sub', async () => {
    const { jwt, adapter } = adapterCon();
    const token = await jwt.signAsync({ sid: SID });

    await expect(adapter.verify(token)).rejects.toBeInstanceOf(NoAutorizadoError);
  });

  it('rechaza un payload sin sid', async () => {
    const { jwt, adapter } = adapterCon();
    const token = await jwt.signAsync({ sub: SUB });

    await expect(adapter.verify(token)).rejects.toBeInstanceOf(NoAutorizadoError);
  });

  it('rechaza sub o sid que no son UUID', async () => {
    const { adapter } = adapterCon();
    const token = await adapter.sign({
      sub: 'no-es-uuid',
      sid: SID,
    });

    await expect(adapter.verify(token)).rejects.toBeInstanceOf(NoAutorizadoError);
  });
});
