import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { CryptoRefreshTokenAdapter } from './crypto-refresh-token.adapter';

function configCon(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
}

describe('CryptoRefreshTokenAdapter', () => {
  it('genera un token opaco y persiste solo su HMAC-SHA256', () => {
    const adapter = new CryptoRefreshTokenAdapter(
      configCon({
        JWT_REFRESH_SECRET: 'pepper-de-prueba',
        JWT_REFRESH_EXPIRES_IN: '7d',
      }),
    );

    const generado = adapter.generar();
    const hashEsperado = createHmac('sha256', 'pepper-de-prueba')
      .update(generado.token)
      .digest('hex');

    expect(generado.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generado.token.length).toBeGreaterThan(32);
    expect(generado.hash).toBe(hashEsperado);
    expect(generado.hash).not.toBe(generado.token);
    expect(generado.expiraEn.getTime()).toBeGreaterThan(Date.now());
  });

  it('falla al inicializar si falta JWT_REFRESH_SECRET', () => {
    expect(
      () =>
        new CryptoRefreshTokenAdapter(
          configCon({ JWT_REFRESH_EXPIRES_IN: '7d' }),
        ),
    ).toThrow('Falta la variable de entorno JWT_REFRESH_SECRET.');
  });

  it('falla al inicializar si JWT_REFRESH_EXPIRES_IN es inválido', () => {
    expect(
      () =>
        new CryptoRefreshTokenAdapter(
          configCon({
            JWT_REFRESH_SECRET: 'pepper-de-prueba',
            JWT_REFRESH_EXPIRES_IN: 'una-semana',
          }),
        ),
    ).toThrow(/JWT_REFRESH_EXPIRES_IN no es válido/);
  });
});
