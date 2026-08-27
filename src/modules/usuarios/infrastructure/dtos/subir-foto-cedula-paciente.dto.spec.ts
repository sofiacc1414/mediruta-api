import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubirFotoCedulaPacienteDto } from './subir-foto-cedula-paciente.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(SubirFotoCedulaPacienteDto, body);
  return validate(dto);
}

describe('SubirFotoCedulaPacienteDto', () => {
  it.each(['frente', 'reverso'])('acepta lado %s', async (lado) => {
    await expect(validar({ lado })).resolves.toHaveLength(0);
  });

  it('rechaza un lado fuera del catálogo', async () => {
    const errores = await validar({ lado: 'diagonal' });
    expect(errores.some((e) => e.property === 'lado')).toBe(true);
  });
});
