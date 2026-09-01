import { SolicitudEdicionSinCambiosError } from '../../domain/errors/solicitud-edicion-sin-cambios.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_EDICION_SOLICITADA,
  SolicitarEdicionPedidoUseCase,
} from './solicitar-edicion-pedido.use-case';

describe('SolicitarEdicionPedidoUseCase', () => {
  const solicitudes = {
    solicitarEdicionPedido: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new SolicitarEdicionPedidoUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('solicita la edición y devuelve mensaje + id', async () => {
    (solicitudes.solicitarEdicionPedido as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
    });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'solicitud-uuid',
      'Calle nueva 123',
      null,
      null,
    );

    expect(resultado).toEqual({
      message: MENSAJE_EDICION_SOLICITADA,
      id: 'novedad-uuid',
    });
    expect(solicitudes.solicitarEdicionPedido).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      'Calle nueva 123',
      null,
      null,
    );
  });

  it('lanza SolicitudEdicionSinCambiosError si no hay ningún dato propuesto', async () => {
    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', '  ', null, null),
    ).rejects.toBeInstanceOf(SolicitudEdicionSinCambiosError);
    expect(solicitudes.solicitarEdicionPedido).not.toHaveBeenCalled();
  });

  it('lanza SolicitudNoEncontradaError si el pedido no es del paciente o no admite edición', async () => {
    (solicitudes.solicitarEdicionPedido as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', 'Calle nueva', null, null),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
