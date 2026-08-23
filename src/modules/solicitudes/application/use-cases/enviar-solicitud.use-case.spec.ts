import { SolicitudIncompletaError } from '../../domain/errors/solicitud-incompleta.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  EnviarSolicitudUseCase,
  MENSAJE_SOLICITUD_ENVIADA,
} from './enviar-solicitud.use-case';

describe('EnviarSolicitudUseCase', () => {
  const solicitudes: SolicitudRepositoryPort = {
    crear: jest.fn(),
    listar: jest.fn(),
    obtener: jest.fn(),
    listarMedicamentos: jest.fn(),
    listarHistorial: jest.fn(),
    actualizar: jest.fn(),
    actualizarReceta: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
  };
  const useCase = new EnviarSolicitudUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G05 — envía y devuelve el mensaje de éxito y el código de pedido', async () => {
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'enviada',
      codigoPedido: 'MR-000123',
    });

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({
      message: MENSAJE_SOLICITUD_ENVIADA,
      codigoPedido: 'MR-000123',
    });
    expect(solicitudes.enviar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
    );
  });

  it('lanza SolicitudIncompletaError con lo que falta', async () => {
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'incompleta',
      faltantes: ['Nombre del medicamento', 'Registro médico'],
    });

    const error = await useCase
      .execute('paciente-uuid', 'solicitud-uuid')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SolicitudIncompletaError);
    expect((error as SolicitudIncompletaError).faltantes).toEqual([
      'Nombre del medicamento',
      'Registro médico',
    ]);
  });

  it('lanza SolicitudNoEncontradaError si no hay una solicitud propia en Borrador con ese id', async () => {
    (solicitudes.enviar as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrada',
    });

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
