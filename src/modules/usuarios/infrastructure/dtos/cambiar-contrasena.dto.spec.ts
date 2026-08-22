import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CambiarContrasenaDto } from './cambiar-contrasena.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(CambiarContrasenaDto, body);
  return validate(dto);
}

const valido = {
  passwordActual: 'ClaveActual1!',
  nuevaPassword: 'ClaveNueva1!',
};

describe('CambiarContrasenaDto', () => {
  it('acepta un cambio válido', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('rechaza si falta passwordActual', async () => {
    const errores = await validar({ nuevaPassword: 'ClaveNueva1!' });
    expect(errores.some((error) => error.property === 'passwordActual')).toBe(
      true,
    );
  });

  it('rechaza si falta nuevaPassword', async () => {
    const errores = await validar({ passwordActual: 'ClaveActual1!' });
    expect(errores.some((error) => error.property === 'nuevaPassword')).toBe(
      true,
    );
  });

  it('rechaza una nueva contraseña débil', async () => {
    const errores = await validar({
      ...valido,
      nuevaPassword: 'sencilla',
    });
    expect(errores.some((error) => error.property === 'nuevaPassword')).toBe(
      true,
    );
  });

  it('acepta una nueva contraseña con la misma política que registro', async () => {
    const errores = await validar({
      ...valido,
      nuevaPassword: 'ClaveNueva1!',
    });
    expect(errores).toHaveLength(0);
  });

  it('no aplica la política de contraseña nueva sobre passwordActual', async () => {
    const errores = await validar({
      passwordActual: 'antigua',
      nuevaPassword: 'ClaveNueva1!',
    });
    expect(errores.some((error) => error.property === 'passwordActual')).toBe(
      false,
    );
  });

  it('no recorta espacios de passwordActual ni de nuevaPassword', async () => {
    const dto = plainToInstance(CambiarContrasenaDto, {
      passwordActual: '  ClaveActual1!  ',
      nuevaPassword: '  ClaveNueva1!  ',
    });

    expect(dto.passwordActual).toBe('  ClaveActual1!  ');
    expect(dto.nuevaPassword).toBe('  ClaveNueva1!  ');
  });
});
