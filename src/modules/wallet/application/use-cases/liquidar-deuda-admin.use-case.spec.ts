import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { WalletNoEncontradaError } from '../../domain/errors/wallet-no-encontrada.error';
import { WalletSinDeudaError } from '../../domain/errors/wallet-sin-deuda.error';
import { WalletRepositoryPort } from '../../domain/ports/wallet.repository.port';
import {
  LiquidarDeudaAdminUseCase,
  MENSAJE_DEUDA_LIQUIDADA,
} from './liquidar-deuda-admin.use-case';

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

describe('LiquidarDeudaAdminUseCase', () => {
  it('devuelve el mensaje de éxito cuando se liquida', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarDeudaAdmin.mockResolvedValue('liquidado');
    const useCase = new LiquidarDeudaAdminUseCase(wallet);

    const resultado = await useCase.execute('admin-uuid', 'domiciliario-uuid');

    expect(resultado).toEqual({ message: MENSAJE_DEUDA_LIQUIDADA });
  });

  it('lanza RolNoAutorizadoError si no es admin', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarDeudaAdmin.mockResolvedValue('no_autorizado');
    const useCase = new LiquidarDeudaAdminUseCase(wallet);

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('lanza WalletNoEncontradaError si no existe', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarDeudaAdmin.mockResolvedValue('no_encontrado');
    const useCase = new LiquidarDeudaAdminUseCase(wallet);

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(WalletNoEncontradaError);
  });

  it('lanza WalletSinDeudaError si no tiene deuda', async () => {
    const wallet = crearMockWallet();
    wallet.liquidarDeudaAdmin.mockResolvedValue('sin_deuda');
    const useCase = new LiquidarDeudaAdminUseCase(wallet);

    await expect(
      useCase.execute('admin-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(WalletSinDeudaError);
  });
});
