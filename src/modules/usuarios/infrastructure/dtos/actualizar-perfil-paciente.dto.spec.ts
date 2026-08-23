import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarPerfilPacienteDto } from './actualizar-perfil-paciente.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(ActualizarPerfilPacienteDto, body);
  return validate(dto);
}

const valido = { direccion: 'Calle 123 #45-67', fechaNacimiento: '1990-05-10' };

describe('ActualizarPerfilPacienteDto', () => {
  it('acepta datos válidos', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('rechaza dirección demasiado corta', async () => {
    const errores = await validar({ ...valido, direccion: 'Ab' });
    expect(errores.some((e) => e.property === 'direccion')).toBe(true);
  });

  it('rechaza fecha de nacimiento con formato inválido', async () => {
    const errores = await validar({
      ...valido,
      fechaNacimiento: 'no-es-fecha',
    });
    expect(errores.some((e) => e.property === 'fechaNacimiento')).toBe(true);
  });

  it('rechaza fecha de nacimiento futura (G04)', async () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const errores = await validar({
      ...valido,
      fechaNacimiento: futuro.toISOString().slice(0, 10),
    });
    expect(errores.some((e) => e.property === 'fechaNacimiento')).toBe(true);
  });
});
