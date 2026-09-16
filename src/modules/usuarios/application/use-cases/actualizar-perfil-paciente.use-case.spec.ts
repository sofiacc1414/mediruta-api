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
    autocompletar: jest.fn(),
  };

  const useCase = new ActualizarPerfilPacienteUseCase(perfiles, geocodificacion);

  const command = {
    usuarioId: 'usuario-uuid',
    direccion: 'Calle 123 #45-67',
    fechaNacimiento: '1990-05-10',
    departamento: 'Cundinamarca',
    ciudad: 'Bogotá',
    direccionVerificada: false,
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

  // Ronda 14 — bug real reportado: guardar volvía a fallar con "no
  // pudimos ubicar esa dirección" para una dirección que la App ya
  // había confirmado segundos antes (Nominatim puede responder
  // distinto entre dos requests por una inconsistencia de caché
  // regional, verificado en vivo). Si la App ya confirmó este mismo
  // texto en esta misma sesión, no tiene sentido volver a
  // geocodificarlo acá — el resultado nunca se guarda, es solo una
  // validación de "¿esto existe?" que la App ya hizo.
  describe('direccionVerificada: true — no repite la geocodificación', () => {
    it('no llama a geocodificar y guarda directo', async () => {
      (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(true);

      const resultado = await useCase.execute({ ...command, direccionVerificada: true });

      expect(geocodificacion.geocodificar).not.toHaveBeenCalled();
      expect(perfiles.upsertPerfilPaciente).toHaveBeenCalledWith(
        'usuario-uuid',
        'Calle 123 #45-67',
        '1990-05-10',
        'Cundinamarca',
        'Bogotá',
      );
      expect(resultado).toEqual({ message: MENSAJE_PERFIL_PACIENTE_ACTUALIZADO });
    });

    it('igual lanza RolNoAutorizadoError si la cuenta no tiene rol PACIENTE (la geocodificación no es lo único que valida)', async () => {
      (perfiles.upsertPerfilPaciente as jest.Mock).mockResolvedValue(false);

      await expect(
        useCase.execute({ ...command, direccionVerificada: true }),
      ).rejects.toBeInstanceOf(RolNoAutorizadoError);
    });
  });
});
