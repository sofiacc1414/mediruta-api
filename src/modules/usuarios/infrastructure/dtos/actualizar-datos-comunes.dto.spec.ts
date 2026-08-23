import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarDatosComunesDto } from './actualizar-datos-comunes.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(ActualizarDatosComunesDto, body);
  return validate(dto);
}

const valido = { nombreCompleto: 'Persona de Prueba', telefono: '3001234567' };

describe('ActualizarDatosComunesDto', () => {
  it('acepta datos válidos', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('rechaza nombre vacío', async () => {
    const errores = await validar({ ...valido, nombreCompleto: '' });
    expect(errores.some((e) => e.property === 'nombreCompleto')).toBe(true);
  });

  it('rechaza teléfono con formato inválido', async () => {
    const errores = await validar({ ...valido, telefono: 'no-es-telefono' });
    expect(errores.some((e) => e.property === 'telefono')).toBe(true);
  });

  it('rechaza teléfono demasiado corto', async () => {
    const errores = await validar({ ...valido, telefono: '123' });
    expect(errores.some((e) => e.property === 'telefono')).toBe(true);
  });
});
