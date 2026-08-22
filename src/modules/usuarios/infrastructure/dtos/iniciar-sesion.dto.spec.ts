import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IniciarSesionDto } from './iniciar-sesion.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(IniciarSesionDto, body);
  return validate(dto);
}

describe('IniciarSesionDto', () => {
  it('acepta un login válido', async () => {
    await expect(
      validar({
        correo: 'persona@mail.com',
        password: 'ClaveSegura1!',
      }),
    ).resolves.toHaveLength(0);
  });

  it('normaliza espacios y mayúsculas del correo antes de validar', async () => {
    const dto = plainToInstance(IniciarSesionDto, {
      correo: '  Persona@MAIL.COM  ',
      password: 'ClaveSegura1!',
    });
    const errores = await validate(dto);

    expect(dto.correo).toBe('persona@mail.com');
    expect(errores).toHaveLength(0);
  });

  it('rechaza un correo inválido', async () => {
    const errores = await validar({
      correo: 'no-es-email',
      password: 'ClaveSegura1!',
    });
    expect(errores.some((error) => error.property === 'correo')).toBe(true);
  });

  it('rechaza un password vacío', async () => {
    const errores = await validar({
      correo: 'persona@mail.com',
      password: '',
    });
    expect(errores.some((error) => error.property === 'password')).toBe(true);
  });

  it('no exige complejidad de contraseña en login', async () => {
    const errores = await validar({
      correo: 'persona@mail.com',
      password: 'sencilla',
    });
    expect(errores).toHaveLength(0);
  });

  it('no recorta espacios del password', async () => {
    const dto = plainToInstance(IniciarSesionDto, {
      correo: 'persona@mail.com',
      password: '  ClaveSegura1!  ',
    });
    expect(dto.password).toBe('  ClaveSegura1!  ');
  });
});
