import { parsearDuracion } from './parsear-duracion';

describe('parsearDuracion', () => {
  it('convierte s, m, h y d a milisegundos', () => {
    expect(parsearDuracion('30s', 'TTL')).toBe(30_000);
    expect(parsearDuracion('15m', 'TTL')).toBe(15 * 60_000);
    expect(parsearDuracion('1h', 'TTL')).toBe(3_600_000);
    expect(parsearDuracion('7d', 'TTL')).toBe(7 * 86_400_000);
  });

  it('rechaza formatos inválidos', () => {
    expect(() => parsearDuracion('7', 'TTL')).toThrow(/TTL no es válido/);
    expect(() => parsearDuracion('7days', 'TTL')).toThrow(/TTL no es válido/);
    expect(() => parsearDuracion('0d', 'TTL')).toThrow(/TTL no es válido/);
  });
});
