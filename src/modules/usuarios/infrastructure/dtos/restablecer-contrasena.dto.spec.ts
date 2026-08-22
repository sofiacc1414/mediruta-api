import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RestablecerContrasenaDto } from './restablecer-contrasena.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(RestablecerContrasenaDto, body);
  return validate(dto);
}

const valido = {
  correo: 'persona@mail.com',
  codigo: '123456',
  nuevaPassword: 'ClaveNueva1!',
};

describe('RestablecerContrasenaDto', () => {
  it('acepta un restablecimiento válido', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('acepta un código con ceros iniciales como string de 6 dígitos', async () => {
    const dto = plainToInstance(RestablecerContrasenaDto, {
      ...valido,
      codigo: '000123',
    });
    const errores = await validate(dto);

    expect(dto.codigo).toBe('000123');
    expect(errores).toHaveLength(0);
  });

  it('normaliza espacios y mayúsculas del correo antes de validar', async () => {
    const dto = plainToInstance(RestablecerContrasenaDto, {
      ...valido,
      correo: '  Persona@MAIL.COM  ',
    });
    const errores = await validate(dto);

    expect(dto.correo).toBe('persona@mail.com');
    expect(errores).toHaveLength(0);
  });

  it('rechaza un correo inválido', async () => {
    const errores = await validar({ ...valido, correo: 'no-es-email' });
    expect(errores.some((error) => error.property === 'correo')).toBe(true);
  });

  it('rechaza un código que no tenga exactamente 6 dígitos', async () => {
    const corto = await validar({ ...valido, codigo: '12345' });
    const largo = await validar({ ...valido, codigo: '1234567' });
    const letras = await validar({ ...valido, codigo: '12a456' });

    expect(corto.some((error) => error.property === 'codigo')).toBe(true);
    expect(largo.some((error) => error.property === 'codigo')).toBe(true);
    expect(letras.some((error) => error.property === 'codigo')).toBe(true);
  });

  it('no convierte el código a number', async () => {
    const dto = plainToInstance(RestablecerContrasenaDto, {
      ...valido,
      codigo: '000123',
    });
    expect(typeof dto.codigo).toBe('string');
    expect(dto.codigo).toBe('000123');
  });

  it('acepta una contraseña que cumple la política de registro', async () => {
    const errores = await validar({
      ...valido,
      nuevaPassword: 'ClaveNueva1!',
    });
    expect(errores).toHaveLength(0);
  });

  it('rechaza una contraseña débil', async () => {
    const errores = await validar({ ...valido, nuevaPassword: 'sencilla' });
    expect(errores.some((error) => error.property === 'nuevaPassword')).toBe(
      true,
    );
  });

  it('no recorta espacios de la nueva contraseña', async () => {
    const dto = plainToInstance(RestablecerContrasenaDto, {
      ...valido,
      nuevaPassword: '  ClaveNueva1!  ',
    });
    expect(dto.nuevaPassword).toBe('  ClaveNueva1!  ');
  });
});
