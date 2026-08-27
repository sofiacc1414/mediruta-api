import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import {
  Medicamento,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import {
  ActualizarSolicitudUseCase,
  MENSAJE_SOLICITUD_ACTUALIZADA,
} from './actualizar-solicitud.use-case';

const MEDICAMENTOS: Medicamento[] = [
  {
    nombre: 'Acetaminofén',
    concentracion: '500mg',
    formaFarmaceutica: 'Tableta',
    cantidad: '30 tabletas',
    posologia: 'Cada 8 horas por 7 días',
  },
];

describe('ActualizarSolicitudUseCase', () => {
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
obtenerDatosGeocodificacionFarmacia: jest.fn(),    obtenerNovedadAbierta: jest.fn(),    listarPedidosDisponibles: jest.fn(),    aceptarPedido: jest.fn(),    marcarMedicamentosRecogidos: jest.fn(),    iniciarEntrega: jest.fn(),    marcarEnSitio: jest.fn(),    entregarPedido: jest.fn(),    reportarNovedad: jest.fn(),    listarNovedadesAbiertas: jest.fn(),    resolverNovedad: jest.fn(),
    obtenerPedidoActivo: jest.fn(),
    listarHistorialPedidos: jest.fn(),
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
    obtenerDocumentosPacienteParaRecoger: jest.fn(),
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
      medicamentos: MEDICAMENTOS,
      recetaFechaVencimiento: '2026-08-01',
      direccionEntrega: 'Calle 1 #2-3',
      direccionFarmacia: 'Carrera 5 #6-7',
    });

    expect(resultado).toEqual({ message: MENSAJE_SOLICITUD_ACTUALIZADA });
    expect(solicitudes.actualizar).toHaveBeenCalledWith(
      'paciente-uuid',
      'solicitud-uuid',
      MEDICAMENTOS,
      '2026-08-01',
      'Calle 1 #2-3',
      'Carrera 5 #6-7',
    );
  });

  it('lanza SolicitudNoEncontradaError si no está en Borrador o no es del dueño', async () => {
    (solicitudes.actualizar as jest.Mock).mockResolvedValue(false);

    await expect(
      useCase.execute({
        pacienteId: 'paciente-uuid',
        solicitudId: 'solicitud-uuid',
        medicamentos: [],
        recetaFechaVencimiento: null,
        direccionEntrega: null,
        direccionFarmacia: null,
      }),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });
});
