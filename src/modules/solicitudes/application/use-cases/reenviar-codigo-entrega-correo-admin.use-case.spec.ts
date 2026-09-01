import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { CorreoCodigoEntregaPort } from '../../domain/ports/correo-codigo-entrega.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_CODIGO_REENVIADO,
  ReenviarCodigoEntregaCorreoAdminUseCase,
} from './reenviar-codigo-entrega-correo-admin.use-case';

describe('ReenviarCodigoEntregaCorreoAdminUseCase', () => {
  const solicitudes = {
    obtenerCodigoEntregaParaCorreoAdmin: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const correo = {
    enviarCodigoEntrega: jest.fn(),
  } as unknown as CorreoCodigoEntregaPort;
  const useCase = new ReenviarCodigoEntregaCorreoAdminUseCase(
    solicitudes,
    correo,
  );

  beforeEach(() => jest.resetAllMocks());

  it('envía el correo con el código vigente', async () => {
    (
      solicitudes.obtenerCodigoEntregaParaCorreoAdmin as jest.Mock
    ).mockResolvedValue({
      resultado: 'ok',
      codigoEntrega: 'AB23CD',
      codigoPedido: 'MR-000123',
      pacienteCorreo: 'paciente@correo.com',
      pacienteNombre: 'Ana Pérez',
    });

    const resultado = await useCase.execute('admin-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ message: MENSAJE_CODIGO_REENVIADO });
    expect(correo.enviarCodigoEntrega).toHaveBeenCalledWith(
      'paciente@correo.com',
      'Ana Pérez',
      'MR-000123',
      'AB23CD',
    );
  });

  it('lanza SolicitudNoEncontradaError si el pedido no tiene código vigente', async () => {
    (
      solicitudes.obtenerCodigoEntregaParaCorreoAdmin as jest.Mock
    ).mockResolvedValue({
      resultado: 'no_encontrado',
      codigoEntrega: null,
      codigoPedido: null,
      pacienteCorreo: null,
      pacienteNombre: null,
    });

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
    expect(correo.enviarCodigoEntrega).not.toHaveBeenCalled();
  });
});
