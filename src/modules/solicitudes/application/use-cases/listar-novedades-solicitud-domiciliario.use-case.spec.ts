import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ListarNovedadesSolicitudDomiciliarioUseCase } from './listar-novedades-solicitud-domiciliario.use-case';

describe('ListarNovedadesSolicitudDomiciliarioUseCase', () => {
  const solicitudes = {
    listarNovedadesSolicitudDomiciliario: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new ListarNovedadesSolicitudDomiciliarioUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('HU-07/HU-09 (ronda 7) — delega en el repositorio y devuelve la lista tal cual', async () => {
    const novedades = [
      {
        id: 'novedad-uuid',
        tipo: 'pregunta' as const,
        detalle: 'Faltó un medicamento',
        origen: 'domiciliario' as const,
        creadoEn: '2026-09-08T10:00:00.000Z',
        resuelta: false,
        accionEdicion: null,
        datosPropuestos: null,
      },
    ];
    (solicitudes.listarNovedadesSolicitudDomiciliario as jest.Mock).mockResolvedValue(
      novedades,
    );

    const resultado = await useCase.execute('domiciliario-uuid', 'solicitud-uuid');

    expect(solicitudes.listarNovedadesSolicitudDomiciliario).toHaveBeenCalledWith(
      'domiciliario-uuid',
      'solicitud-uuid',
    );
    expect(resultado).toBe(novedades);
  });
});
