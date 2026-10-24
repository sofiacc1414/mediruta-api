import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import { LiquidarLoteAdminUseCase } from './liquidar-lote-admin.use-case';

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

describe('LiquidarLoteAdminUseCase', () => {
  it('delega tipo e ids y devuelve el resultado fila por fila sin interrumpirse por filas sin nada que liquidar', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarLoteAdmin.mockResolvedValue([
      { domiciliarioId: 'd1', montoLiquidado: 50000, resultado: 'liquidado' },
      { domiciliarioId: 'd2', montoLiquidado: 0, resultado: 'sin_saldo' },
    ]);
    const useCase = new LiquidarLoteAdminUseCase(wallet);

    const resultado = await useCase.execute('admin-uuid', 'saldo_pendiente', [
      'd1',
      'd2',
    ]);

    expect(resultado).toHaveLength(2);
    expect(resultado[1].resultado).toBe('sin_saldo');
    expect(wallet.liquidarLoteAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'saldo_pendiente',
      ['d1', 'd2'],
    );
  });
});
