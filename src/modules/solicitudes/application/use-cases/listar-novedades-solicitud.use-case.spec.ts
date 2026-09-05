import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarNovedadesSolicitudUseCase } from './listar-novedades-solicitud.use-case';

describe('ListarNovedadesSolicitudUseCase', () => {
  const solicitudes = {
    listarNovedadesSolicitud: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new ListarNovedadesSolicitudUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('HU-07 (ronda 5) — delega en el repositorio y devuelve la lista tal cual', async () => {
    const novedades = [
      {
        id: 'novedad-uuid',
        tipo: 'edicion' as const,
        detalle: 'Pedido corrección',
        origen: 'paciente' as const,
        creadoEn: '2026-09-05T10:00:00.000Z',
        resuelta: true,
        accionEdicion: 'rechazada' as const,
        datosPropuestos: { direccionEntrega: null, direccionFarmacia: null, medicamentos: [] },
      },
    ];
    (solicitudes.listarNovedadesSolicitud as jest.Mock).mockResolvedValue(novedades);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(solicitudes.listarNovedadesSolicitud).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
    );
    expect(resultado).toBe(novedades);
  });
});
