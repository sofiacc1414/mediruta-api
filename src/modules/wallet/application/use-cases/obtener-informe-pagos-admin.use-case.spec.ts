import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { ObtenerInformePagosAdminUseCase } from './obtener-informe-pagos-admin.use-case';

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

describe('ObtenerInformePagosAdminUseCase', () => {
  it('delega admin/desde/hasta y devuelve el informe', async () => {
    const wallet = crearMockWallet();
    wallet.obtenerInformePagosAdmin.mockResolvedValue({
      totalPorPagar: 120000,
      totalPorCobrar: 45000,
      totalLiquidadoPagosPeriodo: 300000,
      totalLiquidadoDeudasPeriodo: 150000,
      totalIngresosEmpresaPeriodo: 75000,
      domiciliariosBloqueados: 2,
      domiciliariosConSaldoPendiente: 5,
    });
    const useCase = new ObtenerInformePagosAdminUseCase(wallet);

    const resultado = await useCase.execute(
      'admin-uuid',
      '2026-10-01',
      '2026-10-31',
    );

    expect(resultado.totalPorPagar).toBe(120000);
    expect(wallet.obtenerInformePagosAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      '2026-10-01',
      '2026-10-31',
    );
  });
});
