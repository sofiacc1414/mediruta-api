import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt } from 'node:crypto';
import { CryptoCodigoRecuperacionAdapter } from './crypto-codigo-recuperacion.adapter';

jest.mock('node:crypto', () => {
  const actual = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    randomInt: jest.fn(actual.randomInt),
  };
});

function configCon(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
}

describe('CryptoCodigoRecuperacionAdapter', () => {
  // `randomInt` está sobrecargado (la variante con callback devuelve
  // `void`) — `jest.MockedFunction<typeof randomInt>` resolvía a esa
  // sobrecarga y `mockReturnValue(42)` no tipaba. Acá solo se usa la
  // variante sync `(min, max) => number`, así que se tipa a esa sola.
  const randomIntMock = randomInt as unknown as jest.MockedFunction<
    (min: number, max: number) => number
  >;

  beforeEach(() => {
    randomIntMock.mockReset();
    randomIntMock.mockImplementation(
      jest.requireActual<typeof import('node:crypto')>('node:crypto').randomInt,
    );
  });

  it('genera exactamente 6 dígitos y solo números', () => {
    const adapter = new CryptoCodigoRecuperacionAdapter(
      configCon({ PASSWORD_RECOVERY_PEPPER: 'pepper-de-prueba' }),
    );

    for (let i = 0; i < 50; i += 1) {
      const codigo = adapter.generarCodigo();
      expect(codigo).toMatch(/^\d{6}$/);
      expect(codigo).toHaveLength(6);
    }
  });

  it('conserva ceros iniciales cuando el entero es menor a 100000', () => {
    randomIntMock.mockReturnValue(42);
    const adapter = new CryptoCodigoRecuperacionAdapter(
      configCon({ PASSWORD_RECOVERY_PEPPER: 'pepper-de-prueba' }),
    );

    expect(adapter.generarCodigo()).toBe('000042');
  });

  it('hash es determinista para el mismo código y pepper', () => {
    const adapter = new CryptoCodigoRecuperacionAdapter(
      configCon({ PASSWORD_RECOVERY_PEPPER: 'pepper-de-prueba' }),
    );
    const esperado = createHmac('sha256', 'pepper-de-prueba')
      .update('000042')
      .digest('hex');

    expect(adapter.hashCodigo('000042')).toBe(esperado);
    expect(adapter.hashCodigo('000042')).toBe(esperado);
  });

  it('hash es distinto para códigos diferentes', () => {
    const adapter = new CryptoCodigoRecuperacionAdapter(
      configCon({ PASSWORD_RECOVERY_PEPPER: 'pepper-de-prueba' }),
    );

    expect(adapter.hashCodigo('000042')).not.toBe(
      adapter.hashCodigo('000043'),
    );
  });

  it('falla al inicializar si falta PASSWORD_RECOVERY_PEPPER', () => {
    expect(
      () => new CryptoCodigoRecuperacionAdapter(configCon({})),
    ).toThrow('Falta la variable de entorno PASSWORD_RECOVERY_PEPPER.');
  });

  it('falla al inicializar si PASSWORD_RECOVERY_PEPPER está vacía', () => {
    expect(
      () =>
        new CryptoCodigoRecuperacionAdapter(
          configCon({ PASSWORD_RECOVERY_PEPPER: '' }),
        ),
    ).toThrow('Falta la variable de entorno PASSWORD_RECOVERY_PEPPER.');
  });
});
