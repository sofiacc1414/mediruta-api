import { ComportamientoDomiciliarioRepositoryPort } from '../../domain/ports/comportamiento-domiciliario.repository.port';
import { ListarResumenComportamientoAdminUseCase } from './listar-resumen-comportamiento-admin.use-case';

function crearMockComportamiento(): jest.Mocked<ComportamientoDomiciliarioRepositoryPort> {
  return {
    listarResumen: jest.fn(),
    obtenerDetalle: jest.fn(),
  };
}

describe('ListarResumenComportamientoAdminUseCase', () => {
  it('devuelve el listado que resuelve el repositorio', async () => {
    const comportamiento = crearMockComportamiento();
    comportamiento.listarResumen.mockResolvedValue([
      {
        domiciliarioId: 'domiciliario-uuid',
        nombreCompleto: 'Juan Pérez',
        correo: 'domi@correo.com',
        estadoCuenta: 'activa',
        entregasRealizadas: 10,
        cancelaciones: 1,
        incidentesReportados: 2,
        incidentesAbiertos: 1,
        calificacionPromedio: 4.5,
        calificacionesCantidad: 8,
        rechazos: null,
      },
    ]);
    const useCase = new ListarResumenComportamientoAdminUseCase(comportamiento);

    const resultado = await useCase.execute('admin-uuid', '2026-10-01', '2026-10-31');

    expect(resultado).toHaveLength(1);
    expect(comportamiento.listarResumen).toHaveBeenCalledWith(
      'admin-uuid',
      '2026-10-01',
      '2026-10-31',
    );
  });
});
