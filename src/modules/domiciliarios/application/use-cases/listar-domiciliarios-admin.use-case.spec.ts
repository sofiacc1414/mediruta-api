import { ValidacionDomiciliarioRepositoryPort } from '../../domain/ports/validacion-domiciliario.repository.port';
import { ListarDomiciliariosAdminUseCase } from './listar-domiciliarios-admin.use-case';

describe('ListarDomiciliariosAdminUseCase', () => {
  const validaciones: ValidacionDomiciliarioRepositoryPort = {
    listarPendientes: jest.fn(),
    listarAdmin: jest.fn(),
    obtenerDetalle: jest.fn(),
    listarHistorial: jest.fn(),
    aprobar: jest.fn(),
    rechazar: jest.fn(),
  };
  const useCase = new ListarDomiciliariosAdminUseCase(validaciones);

  beforeEach(() => jest.resetAllMocks());

  it('sin estado, delega con "pendiente_validacion" (comportamiento histórico)', async () => {
    (validaciones.listarAdmin as jest.Mock).mockResolvedValue([]);

    await useCase.execute('admin-uuid');

    expect(validaciones.listarAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'pendiente_validacion',
    );
  });

  it('pasa el estado recibido al repositorio', async () => {
    (validaciones.listarAdmin as jest.Mock).mockResolvedValue([]);

    await useCase.execute('admin-uuid', 'habilitado');

    expect(validaciones.listarAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'habilitado',
    );
  });

  it('un estado inválido cae a "pendiente_validacion" en vez de fallar', async () => {
    (validaciones.listarAdmin as jest.Mock).mockResolvedValue([]);

    await useCase.execute('admin-uuid', 'no-existe');

    expect(validaciones.listarAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'pendiente_validacion',
    );
  });
});
