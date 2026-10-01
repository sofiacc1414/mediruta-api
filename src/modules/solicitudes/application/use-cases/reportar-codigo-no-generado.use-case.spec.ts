import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { CorreoCodigoEntregaPort } from '../../domain/ports/correo-codigo-entrega.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_CODIGO_NO_GENERADO_REPORTADO,
  ReportarCodigoNoGeneradoUseCase,
} from './reportar-codigo-no-generado.use-case';

describe('ReportarCodigoNoGeneradoUseCase', () => {
  const solicitudes = {
    reportarCodigoNoGenerado: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const correo: CorreoCodigoEntregaPort = { enviarCodigoEntrega: jest.fn() };
  const useCase = new ReportarCodigoNoGeneradoUseCase(solicitudes, correo);

  beforeEach(() => jest.resetAllMocks());

  it('reporta, regenera, reenvía por correo y devuelve mensaje + id', async () => {
    (solicitudes.reportarCodigoNoGenerado as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
      codigoEntrega: 'ABC123',
      codigoPedido: 'MR-000041',
      pacienteCorreo: 'paciente@paciente.com',
      pacienteNombre: 'Juan',
    });

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid', null);

    expect(resultado).toEqual({
      message: MENSAJE_CODIGO_NO_GENERADO_REPORTADO,
      id: 'novedad-uuid',
    });
    expect(solicitudes.reportarCodigoNoGenerado).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      null,
    );
    expect(correo.enviarCodigoEntrega).toHaveBeenCalledWith(
      'paciente@paciente.com',
      'Juan',
      'MR-000041',
      'ABC123',
    );
  });

  it('no revienta el reporte si falla el envío del correo (best-effort)', async () => {
    (solicitudes.reportarCodigoNoGenerado as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
      codigoEntrega: 'ABC123',
      codigoPedido: 'MR-000041',
      pacienteCorreo: 'paciente@paciente.com',
      pacienteNombre: 'Juan',
    });
    (correo.enviarCodigoEntrega as jest.Mock).mockRejectedValue(new Error('smtp caído'));

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', null),
    ).resolves.toEqual({ message: MENSAJE_CODIGO_NO_GENERADO_REPORTADO, id: 'novedad-uuid' });
  });

  it('lanza SolicitudNoEncontradaError si el pedido no es del paciente o ya terminó', async () => {
    (solicitudes.reportarCodigoNoGenerado as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', null),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
    expect(correo.enviarCodigoEntrega).not.toHaveBeenCalled();
  });
});
