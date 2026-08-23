import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';
import { ListarDomiciliariosPendientesUseCase } from './listar-domiciliarios-pendientes.use-case';

describe('ListarDomiciliariosPendientesUseCase', () => {
  const validaciones: ValidacionDomiciliarioRepositoryPort = {
    listarPendientes: jest.fn(),
    obtenerDetalle: jest.fn(),
    listarHistorial: jest.fn(),
    aprobar: jest.fn(),
    rechazar: jest.fn(),
  };
  const useCase = new ListarDomiciliariosPendientesUseCase(validaciones);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('G01 — devuelve la lista que resuelve el repositorio', async () => {
    const lista = [
      {
        usuarioId: 'usuario-uuid',
        nombreCompleto: 'Persona de Prueba',
        telefono: '3001234567',
        solicitadoEn: '2026-08-20T10:00:00.000Z',
      },
    ];
    (validaciones.listarPendientes as jest.Mock).mockResolvedValue(lista);

    const resultado = await useCase.execute('admin-uuid');

    expect(resultado).toBe(lista);
    expect(validaciones.listarPendientes).toHaveBeenCalledWith('admin-uuid');
  });
});
