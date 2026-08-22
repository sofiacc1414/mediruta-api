import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RefrescarSesionDto } from './refrescar-sesion.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(RefrescarSesionDto, body);
  return validate(dto);
}

describe('RefrescarSesionDto', () => {
  it('acepta un refreshToken válido', async () => {
    await expect(
      validar({ refreshToken: 'token-opaco-valido' }),
    ).resolves.toHaveLength(0);
  });

  it('exige refreshToken', async () => {
    const errores = await validar({});
    expect(errores.some((error) => error.property === 'refreshToken')).toBe(
      true,
    );
  });

  it('rechaza un refreshToken vacío', async () => {
    const errores = await validar({ refreshToken: '' });
    expect(errores.some((error) => error.property === 'refreshToken')).toBe(
      true,
    );
  });

  it('no transforma el refreshToken', async () => {
    const dto = plainToInstance(RefrescarSesionDto, {
      refreshToken: '  TokenConMAYUSCULAS  ',
    });
    const errores = await validate(dto);

    expect(dto.refreshToken).toBe('  TokenConMAYUSCULAS  ');
    expect(errores).toHaveLength(0);
  });
});
