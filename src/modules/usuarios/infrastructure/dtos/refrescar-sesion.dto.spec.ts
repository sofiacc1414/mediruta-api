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

  it('permite omitir refreshToken (el flujo Web lo manda por cookie, no por body)', async () => {
    // La validación de "no vino ni por cookie ni por body" la hace el
    // caso de uso (refrescar-sesion.use-case.spec.ts), no el DTO.
    await expect(validar({})).resolves.toHaveLength(0);
  });

  it('rechaza un refreshToken que no sea texto', async () => {
    const errores = await validar({ refreshToken: 12345 });
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
