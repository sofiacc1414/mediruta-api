import { esViolacionCorreoUnico } from './postgres-unique-violation';

describe('esViolacionCorreoUnico', () => {
  it('detecta SQLSTATE 23505 de usuarios_correo_key', () => {
    expect(
      esViolacionCorreoUnico({
        code: '23505',
        constraint: 'usuarios_correo_key',
      }),
    ).toBe(true);
  });

  it('no trata como duplicado de correo otras violaciones UNIQUE', () => {
    expect(
      esViolacionCorreoUnico({
        code: '23505',
        constraint: 'otra_constraint',
      }),
    ).toBe(false);
  });
});
