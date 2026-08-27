import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearAdministradorDto } from './crear-administrador.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(CrearAdministradorDto, body);
  return validate(dto);
}

const valido = {
  correo: 'admin@mail.com',
  password: 'ClaveSegura1!',
};

describe('CrearAdministradorDto', () => {
  it('acepta correo + password solos (nombreCompleto/telefono opcionales)', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('acepta con nombreCompleto y telefono', async () => {
    await expect(
      validar({ ...valido, nombreCompleto: 'Ana Admin', telefono: '3001234567' }),
    ).resolves.toHaveLength(0);
  });

  it('normaliza espacios y mayúsculas del correo antes de validar', async () => {
    const dto = plainToInstance(CrearAdministradorDto, { ...valido, correo: '  Admin@MAIL.COM  ' });
    const errores = await validate(dto);

    expect(dto.correo).toBe('admin@mail.com');
    expect(errores).toHaveLength(0);
  });

  it('rechaza un correo inválido', async () => {
    const errores = await validar({ ...valido, correo: 'no-es-correo' });
    expect(errores.some((e) => e.property === 'correo')).toBe(true);
  });

  it('rechaza una contraseña que no cumple la política', async () => {
    const errores = await validar({ ...valido, password: 'debil' });
    expect(errores.some((e) => e.property === 'password')).toBe(true);
  });
});
