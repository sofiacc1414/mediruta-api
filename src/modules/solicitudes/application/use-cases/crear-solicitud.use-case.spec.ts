import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { PerfilIncompletoError } from '../../domain/errors/perfil-incompleto.error';
import {
  Medicamento,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { CrearSolicitudUseCase } from './crear-solicitud.use-case';

const UN_MEDICAMENTO: Medicamento[] = [
  {
    nombre: 'Acetaminofén',
    concentracion: null,
    formaFarmaceutica: null,
    cantidad: null,
    posologia: null,
  },
];

describe('CrearSolicitudUseCase', () => {
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
    obtenerDatosGeocodificacionFarmacia: jest.fn(),
    obtenerNovedadAbierta: jest.fn(),
    listarNovedadesSolicitud: jest.fn(),
    listarPedidosDisponibles: jest.fn(),
    aceptarPedido: jest.fn(),
    marcarMedicamentosRecogidos: jest.fn(),
    iniciarEntrega: jest.fn(),
    marcarEnSitio: jest.fn(),
    entregarPedido: jest.fn(),
    reportarNovedad: jest.fn(),
    listarNovedadesAbiertas: jest.fn(),
    resolverNovedad: jest.fn(),
    obtenerPedidoActivo: jest.fn(),
    listarHistorialPedidos: jest.fn(),
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
    obtenerDocumentosPacienteParaRecoger: jest.fn(),
    listarPedidosAdmin: jest.fn(),
    obtenerPedidoAdmin: jest.fn(),
    listarMedicamentosPedidoAdmin: jest.fn(),
    listarHistorialPedidoAdmin: jest.fn(),
    obtenerNovedadAbiertaPedidoAdmin: jest.fn(),
    reportarNovedadPaciente: jest.fn(),
    solicitarEdicionPedido: jest.fn(),
    reportarCodigoNoGenerado: jest.fn(),
    aprobarEdicionPedidoAdmin: jest.fn(),
    rechazarEdicionPedidoAdmin: jest.fn(),
    regenerarCodigoEntregaAdmin: jest.fn(),
    obtenerCodigoEntregaParaCorreoAdmin: jest.fn(),
    listarDomiciliariosCercanosAdmin: jest.fn(),
    asignarDomiciliarioAdmin: jest.fn(),
    obtenerConfiguracionAdmin: jest.fn(),
    actualizarConfiguracionAdmin: jest.fn(),
  };
  const useCase = new CrearSolicitudUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01 — crea con medicamentos vacíos (Borrador incompleto es válido)', async () => {
    (solicitudes.crear as jest.Mock).mockResolvedValue({
      resultado: 'creada',
      id: 'solicitud-uuid',
    });

    const resultado = await useCase.execute({
      pacienteId: 'paciente-uuid',
      medicamentos: [],
      recetaFechaVencimiento: null,
      direccionEntrega: null,
      direccionFarmacia: null,
    });

    expect(resultado).toEqual({ id: 'solicitud-uuid' });
    expect(solicitudes.crear).toHaveBeenCalledWith(
      'paciente-uuid',
      [],
      null,
      null,
      null,
      null,
    );
  });

  it('crea con uno o más medicamentos', async () => {
    (solicitudes.crear as jest.Mock).mockResolvedValue({
      resultado: 'creada',
      id: 'solicitud-uuid',
    });

    await useCase.execute({
      pacienteId: 'paciente-uuid',
      medicamentos: UN_MEDICAMENTO,
      recetaFechaVencimiento: '2026-08-01',
      direccionEntrega: 'Calle 1 #2-3',
      direccionFarmacia: 'Carrera 5 #6-7',
    });

    expect(solicitudes.crear).toHaveBeenCalledWith(
      'paciente-uuid',
      UN_MEDICAMENTO,
      null,
      '2026-08-01',
      'Calle 1 #2-3',
      'Carrera 5 #6-7',
    );
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol PACIENTE', async () => {
    (solicitudes.crear as jest.Mock).mockResolvedValue({
      resultado: 'no_autorizado',
    });

    await expect(
      useCase.execute({
        pacienteId: 'paciente-uuid',
        medicamentos: [],
        recetaFechaVencimiento: null,
        direccionEntrega: null,
        direccionFarmacia: null,
      }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('lanza PerfilIncompletoError si el perfil no tiene foto de cédula', async () => {
    (solicitudes.crear as jest.Mock).mockResolvedValue({
      resultado: 'sin_cedula',
    });

    await expect(
      useCase.execute({
        pacienteId: 'paciente-uuid',
        medicamentos: [],
        recetaFechaVencimiento: null,
        direccionEntrega: null,
        direccionFarmacia: null,
      }),
    ).rejects.toBeInstanceOf(PerfilIncompletoError);
  });
});
