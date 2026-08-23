import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarPerfilDomiciliarioDto } from './actualizar-perfil-domiciliario.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(ActualizarPerfilDomiciliarioDto, body);
  return validate(dto);
}

const valido = {
  direccion: 'Calle 123 #45-67',
  vehiculoTipo: 'Moto',
  vehiculoPlaca: 'ABC123',
};

describe('ActualizarPerfilDomiciliarioDto', () => {
  it('acepta datos válidos', async () => {
    await expect(validar(valido)).resolves.toHaveLength(0);
  });

  it('rechaza dirección demasiado corta', async () => {
    const errores = await validar({ ...valido, direccion: 'Ab' });
    expect(errores.some((e) => e.property === 'direccion')).toBe(true);
  });

  it('rechaza vehiculoTipo vacío', async () => {
    const errores = await validar({ ...valido, vehiculoTipo: '' });
    expect(errores.some((e) => e.property === 'vehiculoTipo')).toBe(true);
  });

  it('rechaza vehiculoPlaca demasiado corta', async () => {
    const errores = await validar({ ...valido, vehiculoPlaca: 'AB' });
    expect(errores.some((e) => e.property === 'vehiculoPlaca')).toBe(true);
  });
});
