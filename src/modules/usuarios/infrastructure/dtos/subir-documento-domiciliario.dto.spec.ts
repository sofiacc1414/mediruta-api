import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubirDocumentoDomiciliarioDto } from './subir-documento-domiciliario.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(SubirDocumentoDomiciliarioDto, body);
  return validate(dto);
}

describe('SubirDocumentoDomiciliarioDto', () => {
  it.each([
    'cedula_frente',
    'cedula_reverso',
    'licencia',
    'soat',
    'tecnicomecanica',
  ])('acepta tipo %s', async (tipo) => {
    await expect(validar({ tipo })).resolves.toHaveLength(0);
  });

  it('rechaza un tipo fuera del catálogo', async () => {
    const errores = await validar({ tipo: 'antecedentes' });
    expect(errores.some((e) => e.property === 'tipo')).toBe(true);
  });
});
