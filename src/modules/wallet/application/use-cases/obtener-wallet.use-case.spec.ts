import { WalletNoEncontradaError } from '../../domain/errors/wallet-no-encontrada.error';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { ObtenerWalletUseCase } from './obtener-wallet.use-case';

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

describe('ObtenerWalletUseCase', () => {
  it('devuelve la wallet que resuelve el repositorio', async () => {
    const wallet = crearMockWallet();
    wallet.obtenerWallet.mockResolvedValue({
      comisionAcumulada: 50000,
      saldoCobrado: 30000,
      saldoPendienteCobrar: 10000,
      deudaEfectivo: 20000,
      bloqueadoPorTope: false,
      topeRecaudoEfectivo: 200000,
    });
    const useCase = new ObtenerWalletUseCase(wallet);

    const resultado = await useCase.execute('domiciliario-uuid');

    expect(resultado.saldoCobrado).toBe(30000);
    expect(resultado.saldoPendienteCobrar).toBe(10000);
    expect(wallet.obtenerWallet).toHaveBeenCalledWith('domiciliario-uuid');
  });

  it('lanza WalletNoEncontradaError si el repositorio devuelve null', async () => {
    const wallet = crearMockWallet();
    wallet.obtenerWallet.mockResolvedValue(null);
    const useCase = new ObtenerWalletUseCase(wallet);

    await expect(useCase.execute('domiciliario-uuid')).rejects.toBeInstanceOf(
      WalletNoEncontradaError,
    );
  });
});
