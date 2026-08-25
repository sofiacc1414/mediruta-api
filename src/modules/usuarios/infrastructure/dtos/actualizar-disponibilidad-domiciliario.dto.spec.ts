import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarDisponibilidadDomiciliarioDto } from './actualizar-disponibilidad-domiciliario.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(ActualizarDisponibilidadDomiciliarioDto, body);
  return validate(dto);
}

describe('ActualizarDisponibilidadDomiciliarioDto', () => {
  it('acepta activar con lat/lng válidos', async () => {
    await expect(
      validar({ disponible: true, lat: 4.6486, lng: -74.0628 }),
    ).resolves.toHaveLength(0);
  });

  it('acepta desactivar sin lat/lng (el caso de uso decide si hace falta)', async () => {
    await expect(validar({ disponible: false })).resolves.toHaveLength(0);
  });

  it('rechaza disponible no booleano', async () => {
    const errores = await validar({ disponible: 'sí' });
    expect(errores.some((e) => e.property === 'disponible')).toBe(true);
  });

  it('rechaza una latitud fuera de rango', async () => {
    const errores = await validar({ disponible: true, lat: 200, lng: -74.06 });
    expect(errores.some((e) => e.property === 'lat')).toBe(true);
  });

  it('rechaza una longitud fuera de rango', async () => {
    const errores = await validar({ disponible: true, lat: 4.65, lng: 200 });
    expect(errores.some((e) => e.property === 'lng')).toBe(true);
  });
});
