import { GeocodificacionPort } from '../../../solicitudes/domain/ports/geocodificacion.port';
import { DireccionNoValidaError } from '../../domain/errors/direccion-no-valida.error';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { PerfilRepositoryPort } from '../../domain/ports/perfil.repository.port';
import {
  ActualizarPerfilPacienteUseCase,
  MENSAJE_PERFIL_PACIENTE_ACTUALIZADO,
} from './actualizar-perfil-paciente.use-case';

describe('ActualizarPerfilPacienteUseCase', () => {
  const perfiles: PerfilRepositoryPort = {
    obtenerPerfil: jest.fn(),
    actualizarDatosComunes: jest.fn(),
    upsertPerfilPaciente: jest.fn(),
    actualizarFotoCedulaPaciente: jest.fn(),
    actualizarFotoPerfil: jest.fn(),
    upsertPerfilDomiciliario: jest.fn(),
    actualizarDocumentoDomiciliario: jest.fn(),
    desactivarCuenta: jest.fn(),
    actualizarDisponibilidadDomiciliario: jest.fn(),
    listarNivelesCopago: jest.fn(),
    actualizarNivelCopagoPaciente: jest.fn(),
  };
  const geocodificacion: GeocodificacionPort = {
    geocodificar: jest.fn(),
  };

  const useCase = new ActualizarPerfilPacienteUseCase(perfiles, geocodificacion);

  const command = {
    usuarioId: 'usuario-uuid',
    direccion: 'Calle 123 #45-67',
    fechaNacimiento: '1990-05-10',
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá',
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01/G03 — geocodifica la dirección y, si resuelve, actualiza dirección y fecha de nacimiento', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 4.65,
      lng: -74.06,
      direccionResuelta: 'Calle 123 #45-67, Bogotá',
      precisa: true,
    });
    (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute(command);

    expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
      'Calle 123 #45-67',
      'Bogotá',
      'Cundinamarca',
    );
    expect(perfiles.upsertPerfilPaciente).toHaveBeenCalledWith(
      'usuario-uuid',
      'Calle 123 #45-67',
      '1990-05-10',
      'Cundinamarca',
      'Bogotá',
    );
    expect(resultado).toEqual({ message: MENSAJE_PERFIL_PACIENTE_ACTUALIZADO });
  });

  it('deja guardar igual una dirección imprecisa (lugar grande sin número exacto)', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 4.65,
      lng: -74.06,
      direccionResuelta: 'Un barrio grande, Bogotá',
      precisa: false,
    });
    (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(true);

    const resultado = await useCase.execute(command);

    expect(resultado).toEqual({ message: MENSAJE_PERFIL_PACIENTE_ACTUALIZADO });
  });

  it('regresión del bug real reportado: rechaza el guardado (DireccionNoValidaError) si Nominatim no encuentra nada', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      DireccionNoValidaError,
    );
    expect(perfiles.upsertPerfilPaciente).not.toHaveBeenCalled();
  });

  it('lanza RolNoAutorizadoError si la cuenta no tiene rol PACIENTE', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 4.65,
      lng: -74.06,
      direccionResuelta: 'Calle 123 #45-67, Bogotá',
      precisa: true,
    });
    (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      RolNoAutorizadoError,
    );
  });
});
