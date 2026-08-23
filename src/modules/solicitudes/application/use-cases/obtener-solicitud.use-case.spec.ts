import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  SolicitudDetalle,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { ObtenerSolicitudUseCase } from './obtener-solicitud.use-case';

describe('ObtenerSolicitudUseCase', () => {
  const solicitudes: SolicitudRepositoryPort = {
    crear: jest.fn(),
    listar: jest.fn(),
    obtener: jest.fn(),
    listarHistorial: jest.fn(),
    actualizar: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
  };
  const useCase = new ObtenerSolicitudUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G03 — devuelve el detalle con el historial de estados', async () => {
    const detalle: SolicitudDetalle = {
      id: 'solicitud-uuid',
      estado: 'borrador',
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
      creadoEn: '2026-08-20T10:00:00.000Z',
      enviadoEn: null,
      canceladoEn: null,
    };
    const historial = [
      { estado: 'borrador' as const, creadoEn: '2026-08-20T10:00:00.000Z' },
    ];
    (solicitudes.obtener as jest.Mock).mockResolvedValue(detalle);
    (solicitudes.listarHistorial as jest.Mock).mockResolvedValue(historial);

    const resultado = await useCase.execute('paciente-uuid', 'solicitud-uuid');

    expect(resultado).toEqual({ ...detalle, historial });
    expect(solicitudes.obtener).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
    );
    expect(solicitudes.listarHistorial).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
    );
  });

  it('lanza SolicitudNoEncontradaError si no existe o no es del dueño', async () => {
    (solicitudes.obtener as jest.Mock).mockResolvedValue(null);
    (solicitudes.listarHistorial as jest.Mock).mockResolvedValue([]);

    await expect(
      useCase.execute('paciente-uuid', 'solicitud-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
