import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SolicitarRecuperacionContrasenaDto } from './solicitar-recuperacion-contrasena.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(SolicitarRecuperacionContrasenaDto, body);
  return validate(dto);
}

describe('SolicitarRecuperacionContrasenaDto', () => {
  it('acepta un correo válido', async () => {
    await expect(
      validar({ correo: 'persona@mail.com' }),
    ).resolves.toHaveLength(0);
  });

  it('normaliza espacios y mayúsculas del correo antes de validar', async () => {
    const dto = plainToInstance(SolicitarRecuperacionContrasenaDto, {
      correo: '  Persona@MAIL.COM  ',
    });
    const errores = await validate(dto);

    expect(dto.correo).toBe('persona@mail.com');
    expect(errores).toHaveLength(0);
  });

  it('rechaza un correo inválido', async () => {
    const errores = await validar({ correo: 'no-es-email' });
    expect(errores.some((error) => error.property === 'correo')).toBe(true);
  });

  it('rechaza un correo vacío', async () => {
    const errores = await validar({ correo: '' });
    expect(errores.some((error) => error.property === 'correo')).toBe(true);
  });
});
