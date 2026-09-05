import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  MENSAJE_CODIGO_NO_GENERADO_REPORTADO,
  ReportarCodigoNoGeneradoUseCase,
} from './reportar-codigo-no-generado.use-case';

describe('ReportarCodigoNoGeneradoUseCase', () => {
  const solicitudes = {
    reportarCodigoNoGenerado: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const useCase = new ReportarCodigoNoGeneradoUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('reporta y devuelve mensaje + id', async () => {
    (solicitudes.reportarCodigoNoGenerado as jest.Mock).mockResolvedValue({
      resultado: 'reportada',
      id: 'novedad-uuid',
    });

    const resultado = await useCase.execute(
      'paciente-uuid',
      'solicitud-uuid',
      null,
    );

    expect(resultado).toEqual({
      message: MENSAJE_CODIGO_NO_GENERADO_REPORTADO,
      id: 'novedad-uuid',
    });
    expect(solicitudes.reportarCodigoNoGenerado).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      null,
    );
  });

  it('lanza SolicitudNoEncontradaError si el pedido no es del paciente o ya terminó', async () => {
    (solicitudes.reportarCodigoNoGenerado as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid', null),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
