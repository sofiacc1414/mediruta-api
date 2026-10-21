import { FarmaciaAliadaAdmin } from '../../domain/farmacia-aliada';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import { ListarFarmaciasAliadasAdminUseCase } from './listar-farmacias-aliadas-admin.use-case';

describe('ListarFarmaciasAliadasAdminUseCase', () => {
  it('devuelve el catálogo tal cual lo resuelve el repositorio', async () => {
    const catalogo: FarmaciaAliadaAdmin[] = [
      {
        id: 'farmacia-1',
        eps: 'Sura',
        nombreFarmacia: 'Droguerías Sura',
        ciudad: 'Medellín',
        departamento: 'Antioquia',
        direccion: null,
        telefono: null,
        activo: true,
      },
    ];
    const farmacias = {
      listarAdmin: jest.fn().mockResolvedValue(catalogo),
    } as unknown as FarmaciaAliadaRepositoryPort;
    const useCase = new ListarFarmaciasAliadasAdminUseCase(farmacias);

    const resultado = await useCase.execute('admin-1');

    expect(resultado).toBe(catalogo);
    expect(farmacias.listarAdmin).toHaveBeenCalledWith('admin-1');
  });
});
