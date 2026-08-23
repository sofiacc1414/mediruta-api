import {
  REFRESH_COOKIE_NAME,
  esClienteWeb,
  opcionesCookieRefresh,
} from './refresh-cookie';

describe('refresh-cookie', () => {
  const envOriginal = { ...process.env };

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  describe('esClienteWeb', () => {
    it('es true solo cuando el header vale exactamente "web"', () => {
      expect(esClienteWeb('web')).toBe(true);
      expect(esClienteWeb('app')).toBe(false);
      expect(esClienteWeb(undefined)).toBe(false);
      expect(esClienteWeb('')).toBe(false);
    });
  });

  describe('opcionesCookieRefresh', () => {
    it('usa secure:false y sameSite:lax fuera de producción', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_REFRESH_EXPIRES_IN = '7d';

      const opciones = opcionesCookieRefresh();

      expect(opciones.httpOnly).toBe(true);
      expect(opciones.path).toBe('/auth');
      expect(opciones.secure).toBe(false);
      expect(opciones.sameSite).toBe('lax');
      expect(opciones.maxAge).toBe(7 * 86_400_000);
    });

    it('usa secure:true y sameSite:none en producción', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_REFRESH_EXPIRES_IN = '15m';

      const opciones = opcionesCookieRefresh();

      expect(opciones.secure).toBe(true);
      expect(opciones.sameSite).toBe('none');
      expect(opciones.maxAge).toBe(15 * 60_000);
    });

    it('usa 7d por defecto si JWT_REFRESH_EXPIRES_IN no está definida', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_REFRESH_EXPIRES_IN;

      const opciones = opcionesCookieRefresh();

      expect(opciones.maxAge).toBe(7 * 86_400_000);
    });
  });

  it('REFRESH_COOKIE_NAME tiene un nombre estable con prefijo del proyecto', () => {
    expect(REFRESH_COOKIE_NAME).toBe('mediruta_refresh_token');
  });
});
