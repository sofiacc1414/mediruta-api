import { calcularCantidadDesdePosologia } from './calcular-cantidad-posologia';

describe('calcularCantidadDesdePosologia', () => {
  it('calcula la cantidad total cuando la posología trae dosis, frecuencia y duración', () => {
    expect(
      calcularCantidadDesdePosologia(
        'Tomar 1 tableta (s) cada 6 horas durante 3 dia (s)',
      ),
    ).toBe('12 tableta(s) (calculado)');
  });

  it('calcula correctamente con otra combinación real (caso reportado)', () => {
    expect(
      calcularCantidadDesdePosologia(
        'Tomar 1 tableta (s) cada 8 horas durante 1 dia (s)',
      ),
    ).toBe('3 tableta(s) (calculado)');
  });

  it('respeta dosis por toma mayor a uno', () => {
    // 24/12 = 2 tomas/día * 2 cápsulas/toma * 5 días = 20
    expect(
      calcularCantidadDesdePosologia('Tomar 2 capsulas cada 12 horas durante 5 dias'),
    ).toBe('20 capsulas(s) (calculado)');
  });

  it('redondea hacia arriba cuando la división no es exacta', () => {
    // 24/8 = 3 tomas/día * 1 unidad * 2 días = 6 (exacto, caso de control)
    // 24/5 = 4.8 tomas/día * 1 unidad * 2 días = 9.6 -> 10
    expect(
      calcularCantidadDesdePosologia('Tomar 1 tableta cada 5 horas durante 2 dias'),
    ).toBe('10 tableta(s) (calculado)');
  });

  it('devuelve null para "a libre demanda" — no hay cantidad determinística', () => {
    expect(calcularCantidadDesdePosologia('A LIBRE DEMANDA')).toBeNull();
  });

  it('devuelve null si falta la frecuencia u otra señal', () => {
    expect(calcularCantidadDesdePosologia('Tomar 1 tableta durante 3 dias')).toBeNull();
    expect(calcularCantidadDesdePosologia('Tomar 1 tableta cada 6 horas')).toBeNull();
    expect(calcularCantidadDesdePosologia('cada 6 horas durante 3 dias')).toBeNull();
  });

  it('devuelve null para posología nula o vacía', () => {
    expect(calcularCantidadDesdePosologia(null)).toBeNull();
    expect(calcularCantidadDesdePosologia('')).toBeNull();
  });
});
