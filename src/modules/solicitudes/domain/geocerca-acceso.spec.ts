import { accesoExpirado, dentroDeGeocerca, distanciaMetros } from './geocerca-acceso';

describe('geocerca de acceso (MED-137 / MED-144)', () => {
  it('la misma coordenada está dentro del radio', () => {
    expect(dentroDeGeocerca(6.2442, -75.5812, 6.2442, -75.5812)).toBe(true);
  });

  it('un punto a varios kilómetros queda fuera', () => {
    const metros = distanciaMetros(6.2442, -75.5812, 6.27, -75.5812);
    expect(metros).toBeGreaterThan(150);
    expect(dentroDeGeocerca(6.27, -75.5812, 6.2442, -75.5812)).toBe(false);
  });

  it('sin coordenadas no hay acceso', () => {
    expect(dentroDeGeocerca(null, null, 6.24, -75.58)).toBe(false);
  });

  it('3. el acceso expira cuando pasa la fecha', () => {
    const expira = new Date('2026-09-24T12:10:00Z');
    expect(accesoExpirado(expira, new Date('2026-09-24T12:09:00Z'))).toBe(false);
    expect(accesoExpirado(expira, new Date('2026-09-24T12:10:00Z'))).toBe(true);
  });
});
