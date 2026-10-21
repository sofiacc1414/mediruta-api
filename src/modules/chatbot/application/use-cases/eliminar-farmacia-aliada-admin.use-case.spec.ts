import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { FarmaciaAliadaNoEncontradaError } from '../../domain/errors/farmacia-aliada-no-encontrada.error';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import {
  EliminarFarmaciaAliadaAdminUseCase,
  MENSAJE_FARMACIA_ALIADA_ELIMINADA,
} from './eliminar-farmacia-aliada-admin.use-case';

describe('EliminarFarmaciaAliadaAdminUseCase', () => {
  it('devuelve el mensaje de confirmación si se elimina', async () => {
    const farmacias = {
      eliminarAdmin: jest.fn().mockResolvedValue('eliminado'),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new EliminarFarmaciaAliadaAdminUseCase(farmacias);

    const resultado = await useCase.execute('admin-1', 'farmacia-1');

    expect(resultado).toEqual({ message: MENSAJE_FARMACIA_ALIADA_ELIMINADA });
  });

  it('lanza RolNoAutorizadoError si el repositorio dice no_autorizado', async () => {
    const farmacias = {
      eliminarAdmin: jest.fn().mockResolvedValue('no_autorizado'),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new EliminarFarmaciaAliadaAdminUseCase(farmacias);

    await expect(useCase.execute('admin-1', 'farmacia-1')).rejects.toBeInstanceOf(
      RolNoAutorizadoError,
    );
  });

  it('lanza FarmaciaAliadaNoEncontradaError si el repositorio dice no_encontrado', async () => {
    const farmacias = {
      eliminarAdmin: jest.fn().mockResolvedValue('no_encontrado'),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new EliminarFarmaciaAliadaAdminUseCase(farmacias);

    await expect(useCase.execute('admin-1', 'farmacia-1')).rejects.toBeInstanceOf(
      FarmaciaAliadaNoEncontradaError,
    );
  });
});
