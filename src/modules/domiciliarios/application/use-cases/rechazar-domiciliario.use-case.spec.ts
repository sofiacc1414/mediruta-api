import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { DomiciliarioNoEncontradoError } from '../../domain/errors/domiciliario-no-encontrado.error';
import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';
import {
  MENSAJE_DOMICILIARIO_RECHAZADO,
  RechazarDomiciliarioUseCase,
} from './rechazar-domiciliario.use-case';

describe('RechazarDomiciliarioUseCase', () => {
  const validaciones: ValidacionDomiciliarioRepositoryPort = {
    listarPendientes: jest.fn(),
    obtenerDetalle: jest.fn(),
    listarHistorial: jest.fn(),
    aprobar: jest.fn(),
    rechazar: jest.fn(),
  };
  const useCase = new RechazarDomiciliarioUseCase(validaciones);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G04 — rechaza con motivo y devuelve el mensaje de éxito', async () => {
    (validaciones.rechazar as jest.Mock).mockResolvedValue('rechazado');

    const resultado = await useCase.execute(
      'admin-uuid',
      'domiciliario-uuid',
      'Falta SOAT',
    );

    expect(resultado).toEqual({ message: MENSAJE_DOMICILIARIO_RECHAZADO });
    expect(validaciones.rechazar).toHaveBeenCalledWith(
      'admin-uuid',
      'domiciliario-uuid',
      'Falta SOAT',
    );
  });

  it('lanza DomiciliarioNoEncontradoError si no hay pendiente para ese id', async () => {
    (validaciones.rechazar as jest.Mock).mockResolvedValue('no_encontrado');

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid', 'Falta SOAT'),
    ).rejects.toBeInstanceOf(DomiciliarioNoEncontradoError);
  });

  it('lanza RolNoAutorizadoError si el admin no tiene el rol (defensa en profundidad)', async () => {
    (validaciones.rechazar as jest.Mock).mockResolvedValue('no_autorizado');

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid', 'Falta SOAT'),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
