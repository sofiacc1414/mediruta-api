import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoRegistro } from '../../domain/value-objects/tipo-registro';
import { RegistrarUsuarioDto } from './registrar-usuario.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(RegistrarUsuarioDto, body);
  return validate(dto);
}

const valido = {
  correo: 'persona@mail.com',
  password: 'ClaveSegura1!',
  tipoRegistro: TipoRegistro.PACIENTE,
};

describe('RegistrarUsuarioDto', () => {
  it('acepta un registro válido', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('normaliza espacios y mayúsculas del correo antes de validar', async () => {
    const dto = plainToInstance(RegistrarUsuarioDto, {
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

  it('rechaza contraseña menor a 8 caracteres', async () => {
    const errores = await validar({ ...valido, password: 'Ab1!' });
    expect(errores.some((error) => error.property === 'password')).toBe(true);
  });

  it('rechaza contraseña sin mayúscula', async () => {
    const errores = await validar({ ...valido, password: 'clavesegura1!' });
    expect(errores.some((error) => error.property === 'password')).toBe(true);
  });

  it('rechaza contraseña sin minúscula', async () => {
    const errores = await validar({ ...valido, password: 'CLAVESEGURA1!' });
    expect(errores.some((error) => error.property === 'password')).toBe(true);
  });

  it('rechaza contraseña sin número', async () => {
    const errores = await validar({ ...valido, password: 'ClaveSegura!' });
    expect(errores.some((error) => error.property === 'password')).toBe(true);
  });

  it('rechaza contraseña sin carácter especial', async () => {
    const errores = await validar({ ...valido, password: 'ClaveSegura1' });
    expect(errores.some((error) => error.property === 'password')).toBe(true);
  });

  it('rechaza ADMINISTRADOR y ROOT', async () => {
    const admin = await validar({ ...valido, tipoRegistro: 'ADMINISTRADOR' });
    const root = await validar({ ...valido, tipoRegistro: 'ROOT' });
    expect(admin.some((error) => error.property === 'tipoRegistro')).toBe(true);
    expect(root.some((error) => error.property === 'tipoRegistro')).toBe(true);
  });

  it('acepta altaPaciente ausente (opcional)', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('acepta altaPaciente true/false', async () => {
    await expect(
      validar({ ...valido, altaPaciente: true }),
    ).resolves.toHaveLength(0);
    await expect(
      validar({ ...valido, altaPaciente: false }),
    ).resolves.toHaveLength(0);
  });

  it('rechaza altaPaciente que no sea booleano', async () => {
    const errores = await validar({ ...valido, altaPaciente: 'si' });
    expect(errores.some((error) => error.property === 'altaPaciente')).toBe(
      true,
    );
  });
});
