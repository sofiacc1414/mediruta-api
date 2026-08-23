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
    });

    expect(resultado).toEqual({ id: 'solicitud-uuid' });
    expect(solicitudes.crear).toHaveBeenCalledWith(
      'paciente-uuid',
      [],
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
    });

    expect(solicitudes.crear).toHaveBeenCalledWith(
      'paciente-uuid',
      UN_MEDICAMENTO,
      null,
      '2026-08-01',
      'Calle 1 #2-3',
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
      }),
    ).rejects.toBeInstanceOf(PerfilIncompletoError);
  });
});
