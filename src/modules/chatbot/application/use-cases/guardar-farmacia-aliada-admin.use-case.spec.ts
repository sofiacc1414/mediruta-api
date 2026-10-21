import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { FarmaciaAliadaNoEncontradaError } from '../../domain/errors/farmacia-aliada-no-encontrada.error';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import { GuardarFarmaciaAliadaAdminUseCase } from './guardar-farmacia-aliada-admin.use-case';

describe('GuardarFarmaciaAliadaAdminUseCase', () => {
  const args: [string, string, string, string | null, string | null, string | null, boolean] = [
    'Sura',
    'Droguerías Sura',
    'Medellín',
    'Antioquia',
    null,
    null,
    true,
  ];

  it('devuelve el id cuando el repositorio guarda OK', async () => {
    const farmacias = {
      guardarAdmin: jest.fn().mockResolvedValue({ resultado: 'guardado', id: 'farmacia-1' }),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new GuardarFarmaciaAliadaAdminUseCase(farmacias);

    const resultado = await useCase.execute('admin-1', null, ...args);

    expect(resultado).toEqual({ id: 'farmacia-1' });
    expect(farmacias.guardarAdmin).toHaveBeenCalledWith('admin-1', null, ...args);
  });

  it('lanza RolNoAutorizadoError si el repositorio dice no_autorizado', async () => {
    const farmacias = {
      guardarAdmin: jest.fn().mockResolvedValue({ resultado: 'no_autorizado' }),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new GuardarFarmaciaAliadaAdminUseCase(farmacias);

    await expect(useCase.execute('admin-1', null, ...args)).rejects.toBeInstanceOf(
      RolNoAutorizadoError,
    );
  });

  it('lanza FarmaciaAliadaNoEncontradaError si el repositorio dice no_encontrado', async () => {
    const farmacias = {
      guardarAdmin: jest.fn().mockResolvedValue({ resultado: 'no_encontrado' }),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new GuardarFarmaciaAliadaAdminUseCase(farmacias);

    await expect(useCase.execute('admin-1', 'farmacia-1', ...args)).rejects.toBeInstanceOf(
      FarmaciaAliadaNoEncontradaError,
    );
  });

  it('lanza error genérico si el repositorio dice invalido', async () => {
    const farmacias = {
      guardarAdmin: jest.fn().mockResolvedValue({ resultado: 'invalido' }),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new GuardarFarmaciaAliadaAdminUseCase(farmacias);

    await expect(useCase.execute('admin-1', null, ...args)).rejects.toThrow(
      'La EPS, el nombre de la farmacia y la ciudad son obligatorios.',
    );
  });
});
