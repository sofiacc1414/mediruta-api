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
      null,
      false,
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
      null,
      false,
    );
  });

  it('lanza SolicitudEdicionSinCambiosError si no hay ningún dato propuesto', async () => {
    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', '  ', null, null, null, false),
    ).rejects.toBeInstanceOf(SolicitudEdicionSinCambiosError);
    expect(solicitudes.solicitarEdicionPedido).not.toHaveBeenCalled();
  });

  it('no lanza SolicitudEdicionSinCambiosError si solo hay medicamentos propuestos', async () => {
    (solicitudes.solicitarEdicionPedido as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
    });

    await useCase.execute('paciente-uuid', 'solicitud-uuid', null, null, null, [
      { nombre: 'Ibuprofeno', concentracion: null, formaFarmaceutica: null, cantidad: null, posologia: null },
    ], false);

    expect(solicitudes.solicitarEdicionPedido).toHaveBeenCalled();
  });

  it('no lanza SolicitudEdicionSinCambiosError si incluyeReceta es true', async () => {
    (solicitudes.solicitarEdicionPedido as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
    });

    await useCase.execute('paciente-uuid', 'solicitud-uuid', null, null, null, null, true);

    expect(solicitudes.solicitarEdicionPedido).toHaveBeenCalled();
  });

  it('lanza SolicitudNoEncontradaError si el pedido no es del paciente o no admite edición', async () => {
    (solicitudes.solicitarEdicionPedido as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', 'Calle nueva', null, null, null, false),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
