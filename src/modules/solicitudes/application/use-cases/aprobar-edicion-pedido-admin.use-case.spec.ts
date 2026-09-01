import { NovedadNoEncontradaError } from '../../domain/errors/novedad-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  AprobarEdicionPedidoAdminUseCase,
  MENSAJE_EDICION_APROBADA,
} from './aprobar-edicion-pedido-admin.use-case';

describe('AprobarEdicionPedidoAdminUseCase', () => {
  const solicitudes = {
    aprobarEdicionPedidoAdmin: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new AprobarEdicionPedidoAdminUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('aprueba y devuelve mensaje', async () => {
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'aprobada',
    );

    const resultado = await useCase.execute('admin-uuid', 'novedad-uuid');

    expect(resultado).toEqual({ message: MENSAJE_EDICION_APROBADA });
    expect(solicitudes.aprobarEdicionPedidoAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'novedad-uuid',
    );
  });

  it('lanza NovedadNoEncontradaError si no existe o ya estaba resuelta', async () => {
    (solicitudes.aprobarEdicionPedidoAdmin as jest.Mock).mockResolvedValue(
      'no_encontrado',
    );

    await expect(
      useCase.execute('admin-uuid', 'novedad-uuid'),
    ).rejects.toBeInstanceOf(NovedadNoEncontradaError);
  });
});
