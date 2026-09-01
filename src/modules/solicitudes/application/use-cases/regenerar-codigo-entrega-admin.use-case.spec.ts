import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_CODIGO_REGENERADO,
  RegenerarCodigoEntregaAdminUseCase,
} from './regenerar-codigo-entrega-admin.use-case';

describe('RegenerarCodigoEntregaAdminUseCase', () => {
  const solicitudes = {
    regenerarCodigoEntregaAdmin: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new RegenerarCodigoEntregaAdminUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('regenera y devuelve el nuevo código', async () => {
    (solicitudes.regenerarCodigoEntregaAdmin as jest.Mock).mockResolvedValue({
      resultado: 'regenerado',
      codigoEntrega: 'AB23CD',
    });

    const resultado = await useCase.execute('admin-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({
      message: MENSAJE_CODIGO_REGENERADO,
      codigoEntrega: 'AB23CD',
    });
  });

  it('lanza SolicitudNoEncontradaError si el pedido no admite regenerar el código', async () => {
    (solicitudes.regenerarCodigoEntregaAdmin as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
      codigoEntrega: null,
    });

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
