import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { ObtenerWalletPeriodoUseCase } from './obtener-wallet-periodo.use-case';

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

describe('ObtenerWalletPeriodoUseCase', () => {
  it('delega domiciliarioId/desde/hasta y devuelve el balance del periodo', async () => {
    const wallet = crearMockWallet();
    wallet.obtenerWalletPeriodo.mockResolvedValue({
      cobradoEfectivoPeriodo: 15000,
      pendienteTarjetaTransferenciaPeriodo: 8000,
      deudaGeneradaEfectivoPeriodo: 20000,
      liquidadoEnPeriodo: 5000,
      balancePeriodo: 23000,
    });
    const useCase = new ObtenerWalletPeriodoUseCase(wallet);

    const resultado = await useCase.execute(
      'domiciliario-uuid',
      '2026-10-01',
      '2026-10-31',
    );

    expect(resultado.balancePeriodo).toBe(23000);
    expect(wallet.obtenerWalletPeriodo).toHaveBeenCalledWith(
      'domiciliario-uuid',
      '2026-10-01',
      '2026-10-31',
    );
  });
});
