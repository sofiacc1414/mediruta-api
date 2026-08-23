import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { DocumentacionIncompletaError } from '../../domain/errors/documentacion-incompleta.error';
import { DomiciliarioNoEncontradoError } from '../../domain/errors/domiciliario-no-encontrado.error';
import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';
import {
  AprobarDomiciliarioUseCase,
  MENSAJE_DOMICILIARIO_APROBADO,
} from './aprobar-domiciliario.use-case';

describe('AprobarDomiciliarioUseCase', () => {
  const validaciones: ValidacionDomiciliarioRepositoryPort = {
    listarPendientes: jest.fn(),
    obtenerDetalle: jest.fn(),
    listarHistorial: jest.fn(),
    aprobar: jest.fn(),
    rechazar: jest.fn(),
  };
  const useCase = new AprobarDomiciliarioUseCase(validaciones);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G03 — aprueba y devuelve el mensaje de éxito', async () => {
    (validaciones.aprobar as jest.Mock).mockResolvedValue({
      resultado: 'aprobado',
    });

    const resultado = await useCase.execute('admin-uuid', 'domiciliario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_DOMICILIARIO_APROBADO });
    expect(validaciones.aprobar).toHaveBeenCalledWith(
      'admin-uuid',
      'domiciliario-uuid',
    );
  });

  it('G05 — lanza DocumentacionIncompletaError con lo que falta', async () => {
    (validaciones.aprobar as jest.Mock).mockResolvedValue({
      resultado: 'incompleto',
      faltantes: ['SOAT', 'Tecnomecánica'],
    });

    const error = await useCase
      .execute('admin-uuid', 'domiciliario-uuid')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DocumentacionIncompletaError);
    expect((error as DocumentacionIncompletaError).faltantes).toEqual([
      'SOAT',
      'Tecnomecánica',
    ]);
  });

  it('lanza DomiciliarioNoEncontradoError si no hay pendiente para ese id', async () => {
    (validaciones.aprobar as jest.Mock).mockResolvedValue({
      resultado: 'no_encontrado',
    });

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(DomiciliarioNoEncontradoError);
  });

  it('lanza RolNoAutorizadoError si el admin no tiene el rol (defensa en profundidad)', async () => {
    (validaciones.aprobar as jest.Mock).mockResolvedValue({
      resultado: 'no_autorizado',
    });

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });
});
