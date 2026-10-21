import { FarmaciaAliada } from '../../domain/farmacia-aliada';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import { ListarFarmaciasAliadasPorEpsUseCase } from './listar-farmacias-aliadas-por-eps.use-case';

describe('ListarFarmaciasAliadasPorEpsUseCase', () => {
  it('delega usuario y EPS en el repositorio', async () => {
    const resultado: FarmaciaAliada[] = [];
    const farmacias = {
      listarPorEps: jest.fn().mockResolvedValue(resultado),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new ListarFarmaciasAliadasPorEpsUseCase(farmacias);

    await useCase.execute('usuario-1', 'Sura');

    expect(farmacias.listarPorEps).toHaveBeenCalledWith('usuario-1', 'Sura');
  });
});
