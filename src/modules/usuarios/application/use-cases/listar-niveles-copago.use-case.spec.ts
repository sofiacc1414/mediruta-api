import {
  NivelCopago,
  PerfilRepositoryPort,
} from '../../domain/ports/perfil.repository.port';
import { ListarNivelesCopagoUseCase } from './listar-niveles-copago.use-case';

describe('ListarNivelesCopagoUseCase', () => {
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
  const useCase = new ListarNivelesCopagoUseCase(perfiles);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('delega en el repositorio y devuelve el catálogo tal cual', async () => {
    const niveles: NivelCopago[] = [
      { id: 'nivel-1', nombre: 'Nivel 1', copago: 8000, orden: 1 },
      { id: 'nivel-2', nombre: 'Nivel 2', copago: 15000, orden: 2 },
    ];
    (perfiles.listarNivelesCopago as jest.Mock).mockResolvedValue(niveles);

    const resultado = await useCase.execute('usuario-uuid');

    expect(resultado).toEqual(niveles);
    expect(perfiles.listarNivelesCopago).toHaveBeenCalledWith('usuario-uuid');
  });
});
