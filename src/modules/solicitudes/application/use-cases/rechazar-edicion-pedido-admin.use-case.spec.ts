import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_EDICION_RECHAZADA,
  RechazarEdicionPedidoAdminUseCase,
} from './rechazar-edicion-pedido-admin.use-case';

describe('RechazarEdicionPedidoAdminUseCase', () => {
  const solicitudes = {
    rechazarEdicionPedidoAdmin: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new RechazarEdicionPedidoAdminUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('rechaza y devuelve mensaje', async () => {
    (solicitudes.rechazarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'rechazada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_RECHAZADA });
    expect(solicitudes.rechazarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
    );
  });

  it('lanza NovedadNoEncontradaError si no existe o ya estaba resuelta', async () => {
    (solicitudes.rechazarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'no_encontrado',
    );

    await expect(
      useCase.execute('admin-uuid', 'novedad-uuid'),
    ).rejects.toBeInstanceOf(NovedadNoEncontradaError);
  });
});
