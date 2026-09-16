import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  AprobarEdicionPedidoAdminUseCase,
  MENSAJE_EDICION_APROBADA,
} from './aprobar-edicion-pedido-admin.use-case';

describe('AprobarEdicionPedidoAdminUseCase', () => {
  const solicitudes = {
    aprobarEdicionPedidoAdmin: jest.fn(),
    obtenerDatosGeocodificacionNovedadAdmin: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const geocodificacion = {
    geocodificar: jest.fn(),
  } as unknown as GeocodificacionPort;
  const useCase = new AprobarEdicionPedidoAdminUseCase(
    solicitudes,
    geocodificacion,
  );

  beforeEach(() => jest.resetAllMocks());

  it('la edición no toca ninguna dirección — no geocodifica, aprueba igual', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionNovedadAdmin as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: null,
      direccionEntrega: null,
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'aprobada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_APROBADA });
    expect(geocodificacion.geocodificar).not.toHaveBeenCalled();
    expect(solicitudes.aprobarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
      null,
      null,
      null,
      null,
    );
  });

  it('la edición cambia la dirección de la farmacia — geocodifica y pasa lat/lng', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionNovedadAdmin as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: 'Cra 1 # 2-3',
      direccionEntrega: null,
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 6.25,
      lng: -75.56,
    });
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'aprobada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_APROBADA });
    expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
      'Cra 1 # 2-3',
      'Medellín',
      'Antioquia',
    );
    expect(solicitudes.aprobarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
      6.25,
      -75.56,
      null,
      null,
    );
  });

  it('la edición cambia la dirección de ENTREGA — geocodifica y pasa lat/lng de entrega (regresión del bug de precio)', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionNovedadAdmin as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: null,
      direccionEntrega: 'Cll 10 # 20-30',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 6.2,
      lng: -75.58,
    });
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'aprobada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_APROBADA });
    expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
      'Cll 10 # 20-30',
      'Medellín',
      'Antioquia',
    );
    expect(solicitudes.aprobarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
      null,
      null,
      6.2,
      -75.58,
    );
  });

  it('la edición cambia farmacia y entrega a la vez — geocodifica ambas', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionNovedadAdmin as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: 'Cra 1 # 2-3',
      direccionEntrega: 'Cll 10 # 20-30',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });
    (geocodificacion.geocodificar as jest.Mock)
      .mockResolvedValueOnce({ lat: 6.25, lng: -75.56 })
      .mockResolvedValueOnce({ lat: 6.2, lng: -75.58 });
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'aprobada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_APROBADA });
    expect(geocodificacion.geocodificar).toHaveBeenCalledTimes(2);
    expect(solicitudes.aprobarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
      6.25,
      -75.56,
      6.2,
      -75.58,
    );
  });

  it('Nominatim no resuelve ninguna dirección — aprueba igual, sin lat/lng', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionNovedadAdmin as jest.Mock
    ).mockResolvedValue({
      direccionFarmacia: 'Dirección rarísima',
      direccionEntrega: 'Otra dirección rarísima',
      ciudad: null,
      departamento: null,
    });
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue(null);
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'aprobada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_APROBADA });
    expect(solicitudes.aprobarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
      null,
      null,
      null,
      null,
    );
  });

  it('lanza NovedadNoEncontradaError si no existe o ya estaba resuelta', async () => {
    (
      solicitudes.obtenerDatosGeocodificacionNovedadAdmin as jest.Mock
    ).mockResolvedValue(null);
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'no_encontrado',
    );

    await expect(
      useCase.execute('admin-uuid', 'novedad-uuid'),
    ).rejects.toBeInstanceOf(NovedadNoEncontradaError);
  });
});
