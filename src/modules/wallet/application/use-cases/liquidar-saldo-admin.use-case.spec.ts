import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { WalletNoEncontradaError } from '../../domain/errors/wallet-no-encontrada.error';
import { WalletSinSaldoError } from '../../domain/errors/wallet-sin-saldo.error';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import {
  LiquidarSaldoAdminUseCase,
  MENSAJE_SALDO_LIQUIDADO,
} from './liquidar-saldo-admin.use-case';

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

describe('LiquidarSaldoAdminUseCase', () => {
  it('devuelve el mensaje de éxito cuando se liquida', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarSaldoAdmin.mockResolvedValue('liquidado');
    const useCase = new LiquidarSaldoAdminUseCase(wallet);

    const resultado = await useCase.execute('admin-uuid', 'domiciliario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_SALDO_LIQUIDADO });
  });

  it('lanza RolNoAutorizadoError si no es admin', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarSaldoAdmin.mockResolvedValue('no_autorizado');
    const useCase = new LiquidarSaldoAdminUseCase(wallet);

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('lanza WalletNoEncontradaError si no existe', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarSaldoAdmin.mockResolvedValue('no_encontrado');
    const useCase = new LiquidarSaldoAdminUseCase(wallet);

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(WalletNoEncontradaError);
  });

  it('lanza WalletSinSaldoError si no tiene saldo pendiente', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarSaldoAdmin.mockResolvedValue('sin_saldo');
    const useCase = new LiquidarSaldoAdminUseCase(wallet);

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(WalletSinSaldoError);
  });
});
