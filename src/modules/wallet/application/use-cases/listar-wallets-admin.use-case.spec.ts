import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { ListarWalletsAdminUseCase } from './listar-wallets-admin.use-case';

function crearMockWallet(): jest.Mocked<WalletRepositoryPort> {
  return {
    obtenerWallet: jest.fn(),
    obtenerWalletPeriodo: jest.fn(),
    listarWalletsAdmin: jest.fn(),
    liquidarDeudaAdmin: jest.fn(),
    liquidarSaldoAdmin: jest.fn(),
    liquidarLoteAdmin: jest.fn(),
    obtenerInformePagosAdmin: jest.fn(),
    listarPagadoPeriodoAdmin: jest.fn(),
  };
}

describe('ListarWalletsAdminUseCase', () => {
  it('devuelve el listado que resuelve el repositorio', async () => {
    const wallet = crearMockWallet();
    wallet.listarWalletsAdmin.mockResolvedValue([
      {
        domiciliarioId: 'domiciliario-uuid',
        correo: 'domi@correo.com',
        comisionAcumulada: 50000,
        saldoCobrado: 30000,
        saldoPendienteCobrar: 10000,
        deudaEfectivo: 20000,
        bloqueadoPorTope: false,
      },
    ]);
    const useCase = new ListarWalletsAdminUseCase(wallet);

    const resultado = await useCase.execute('admin-uuid');

    expect(resultado).toHaveLength(1);
    expect(wallet.listarWalletsAdmin).toHaveBeenCalledWith('admin-uuid');
  });
});
