import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  DatosSolicitud,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import {
  ActualizarSolicitudUseCase,
  MENSAJE_SOLICITUD_ACTUALIZADA,
} from './actualizar-solicitud.use-case';

const DATOS: DatosSolicitud = {
  medicamentoNombre: 'Acetaminofén',
  medicamentoConcentracion: '500mg',
  medicamentoFormaFarmaceutica: 'Tableta',
  medicamentoCantidad: '30 tabletas',
  medicamentoPosologia: 'Cada 8 horas por 7 días',
  recetaMedicoNombre: 'Dra. Ana Pérez',
  recetaMedicoRegistro: 'RM12345',
  recetaIps: 'IPS Central',
  recetaFechaExpedicion: '2026-08-01',
  direccionEntrega: 'Calle 1 #2-3',
};

describe('ActualizarSolicitudUseCase', () => {
  const solicitudes: SolicitudRepositoryPort = {
    crear: jest.fn(),
    listar: jest.fn(),
    obtener: jest.fn(),
    listarHistorial: jest.fn(),
    actualizar: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
  };
  const useCase = new ActualizarSolicitudUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G04 — actualiza y devuelve el mensaje de éxito', async () => {
    (solicitudes.actualizar as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute({
      pacienteId: 'paciente-uuid',
      solicitudId: 'solicitud-uuid',
      ...DATOS,
    });

    expect(resultado).toEqual({ message: MENSAJE_SOLICITUD_ACTUALIZADA });
    expect(solicitudes.actualizar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      DATOS,
    );
  });

  it('lanza SolicitudNoEncontradaError si no está en Borrador o no es del dueño', async () => {
    (solicitudes.actualizar as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        pacienteId: 'paciente-uuid',
        solicitudId: 'solicitud-uuid',
        ...DATOS,
      }),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
