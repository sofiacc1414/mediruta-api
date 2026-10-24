import { ComportamientoDomiciliarioRepositoryPort } from '../../domain/ports/comportamiento-domiciliario.repository.port';
import { ObtenerDetalleComportamientoAdminUseCase } from './obtener-detalle-comportamiento-admin.use-case';

function crearMockComportamiento(): jest.Mocked<ComportamientoDomiciliarioRepositoryPort> {
  return {
    listarResumen: jest.fn(),
    obtenerDetalle: jest.fn(),
  };
}

describe('ObtenerDetalleComportamientoAdminUseCase', () => {
  it('devuelve el detalle que resuelve el repositorio', async () => {
    const comportamiento = crearMockComportamiento();
    comportamiento.obtenerDetalle.mockResolvedValue({
      resumen: {
        domiciliarioId: 'domiciliario-uuid',
        nombreCompleto: 'Juan Pérez',
        correo: 'domi@correo.com',
        estadoCuenta: 'activa',
        entregasRealizadas: 3,
        cancelaciones: 0,
        incidentesReportados: 0,
        incidentesAbiertos: 0,
        calificacionPromedio: null,
        calificacionesCantidad: 0,
        rechazos: null,
      },
      eventos: [],
    });
    const useCase = new ObtenerDetalleComportamientoAdminUseCase(comportamiento);

    const resultado = await useCase.execute(
      'admin-uuid',
      'domiciliario-uuid',
      '2026-10-01',
      '2026-10-31',
    );

    expect(resultado?.resumen.domiciliarioId).toBe('domiciliario-uuid');
    expect(comportamiento.obtenerDetalle).toHaveBeenCalledWith(
      'admin-uuid',
      'domiciliario-uuid',
      '2026-10-01',
      '2026-10-31',
    );
  });

  it('propaga null cuando el domiciliario no existe', async () => {
    const comportamiento = crearMockComportamiento();
    comportamiento.obtenerDetalle.mockResolvedValue(null);
    const useCase = new ObtenerDetalleComportamientoAdminUseCase(comportamiento);

    const resultado = await useCase.execute(
      'admin-uuid',
      'no-existe',
      '2026-10-01',
      '2026-10-31',
    );

    expect(resultado).toBeNull();
  });
});
