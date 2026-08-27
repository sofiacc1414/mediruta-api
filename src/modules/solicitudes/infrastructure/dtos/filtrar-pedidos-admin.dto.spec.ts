import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FiltrarPedidosAdminDto } from './filtrar-pedidos-admin.dto';

async function validar(body: Record<string, unknown>) {
  const dto = plainToInstance(FiltrarPedidosAdminDto, body);
  return validate(dto);
}

describe('FiltrarPedidosAdminDto', () => {
  it('acepta sin ningún filtro (todos opcionales)', async () => {
    await expect(validar({})).resolves.toHaveLength(0);
  });

  it.each([
    'borrador',
    'pendiente_revision',
    'en_asignacion',
    'asignado_en_camino_farmacia',
    'medicamentos_recogidos',
    'en_camino_entrega',
    'en_sitio',
    'entregado',
    'cancelada',
  ])('acepta estado %s', async (estado) => {
    await expect(validar({ estado })).resolves.toHaveLength(0);
  });

  it('rechaza un estado fuera del catálogo', async () => {
    const errores = await validar({ estado: 'inventado' });
    expect(errores.some((e) => e.property === 'estado')).toBe(true);
  });

  it('acepta desde/hasta en formato ISO 8601', async () => {
    await expect(
      validar({
        desde: '2026-08-01T00:00:00.000Z',
        hasta: '2026-08-31T23:59:59.000Z',
      }),
    ).resolves.toHaveLength(0);
  });

  it('rechaza desde/hasta que no son fechas ISO 8601', async () => {
    const errores = await validar({ desde: 'ayer' });
    expect(errores.some((e) => e.property === 'desde')).toBe(true);
  });

  it('acepta búsqueda libre', async () => {
    await expect(validar({ busqueda: 'MR-000123' })).resolves.toHaveLength(0);
  });
});
