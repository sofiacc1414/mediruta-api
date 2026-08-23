import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import {
  DatosSolicitud,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { CrearSolicitudUseCase } from './crear-solicitud.use-case';

const DATOS_VACIOS: DatosSolicitud = {
  medicamentoNombre: null,
  medicamentoConcentracion: null,
  medicamentoFormaFarmaceutica: null,
  medicamentoCantidad: null,
  medicamentoPosologia: null,
  recetaMedicoNombre: null,
  recetaMedicoRegistro: null,
  recetaIps: null,
  recetaFechaExpedicion: null,
  direccionEntrega: null,
};

describe('CrearSolicitudUseCase', () => {
  const solicitudes: SolicitudRepositoryPort = {
    crear: jest.fn(),
    listar: jest.fn(),
    obtener: jest.fn(),
    listarHistorial: jest.fn(),
    actualizar: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
  };
  const useCase = new CrearSolicitudUseCase(solicitudes);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01 — crea con campos vacíos (Borrador incompleto es válido)', async () => {
    (solicitudes.crear as jest.Mock).mockResolvedValue('solicitud-uuid');

    const resultado = await useCase.execute({
      pacienteId: 'paciente-uuid',
      ...DATOS_VACIOS,
    });

    expect(resultado).toEqual({ id: 'solicitud-uuid' });
    expect(solicitudes.crear).toHaveBeenCalledWith(
      'paciente-uuid',
      DATOS_VACIOS,
    );
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol PACIENTE', async () => {
    (solicitudes.crear as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ pacienteId: 'paciente-uuid', ...DATOS_VACIOS }),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
