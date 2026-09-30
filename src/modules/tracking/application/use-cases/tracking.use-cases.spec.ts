import { SolicitudNoEncontradaError } from '../../../solicitudes/domain/errors/solicitud-no-encontrada.error';
import { NoAutorizadoError } from '../../../usuarios/domain/errors/no-autorizado.error';
import { PedidoNoEnCaminoError } from '../../domain/errors/pedido-no-en-camino.error';
import { TrackingNoDisponibleError } from '../../domain/errors/tracking-no-disponible.error';
import { PosicionEnVivo, TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';
import { ActualizarPosicionEnVivoUseCase } from './actualizar-posicion-en-vivo.use-case';
import { ObtenerPosicionEnVivoUseCase } from './obtener-posicion-en-vivo.use-case';

const posicion: PosicionEnVivo = {
  estado: 'en_camino_entrega',
  domiciliarioLat: 6.2449,
  domiciliarioLng: -75.571,
  ubicacionActualizadaEn: '2026-09-30T18:14:15.000Z',
  farmaciaLat: 6.2442,
  farmaciaLng: -75.5714,
  entregaLat: 6.251,
  entregaLng: -75.568,
};

describe('Seguimiento GPS en vivo — HU tracking', () => {
  const tracking: TrackingRepositoryPort = {
    actualizarUbicacion: jest.fn(),
    obtenerPosicion: jest.fn(),
  };

  const actualizar = new ActualizarPosicionEnVivoUseCase(tracking);
  const obtener = new ObtenerPosicionEnVivoUseCase(tracking);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('ActualizarPosicionEnVivoUseCase', () => {
    it('no lanza nada cuando el domiciliario está en camino', async () => {
      (tracking.actualizarUbicacion as jest.Mock).mockResolvedValue('ok');

      await expect(
        actualizar.execute('domiciliario-1', 'sol-1', 6.24, -75.57),
      ).resolves.toBeUndefined();
    });

    it('lanza PedidoNoEnCaminoError si el pedido no está en_camino_entrega', async () => {
      (tracking.actualizarUbicacion as jest.Mock).mockResolvedValue('pedido_no_en_camino');

      await expect(
        actualizar.execute('domiciliario-1', 'sol-1', 6.24, -75.57),
      ).rejects.toBeInstanceOf(PedidoNoEnCaminoError);
    });

    it('lanza NoAutorizadoError si no es el domiciliario del pedido', async () => {
      (tracking.actualizarUbicacion as jest.Mock).mockResolvedValue('no_autorizado');

      await expect(
        actualizar.execute('intruso', 'sol-1', 6.24, -75.57),
      ).rejects.toBeInstanceOf(NoAutorizadoError);
    });
  });

  describe('ObtenerPosicionEnVivoUseCase', () => {
    it('devuelve la posición cuando el resultado es ok', async () => {
      (tracking.obtenerPosicion as jest.Mock).mockResolvedValue({ resultado: 'ok', posicion });

      await expect(obtener.execute('paciente-1', 'sol-1')).resolves.toEqual(posicion);
    });

    it('lanza SolicitudNoEncontradaError si el pedido no existe', async () => {
      (tracking.obtenerPosicion as jest.Mock).mockResolvedValue({ resultado: 'pedido_no_encontrado' });

      await expect(obtener.execute('paciente-1', 'sol-1')).rejects.toBeInstanceOf(
        SolicitudNoEncontradaError,
      );
    });

    it('lanza TrackingNoDisponibleError fuera de la ventana de tracking', async () => {
      (tracking.obtenerPosicion as jest.Mock).mockResolvedValue({ resultado: 'sin_tracking_disponible' });

      await expect(obtener.execute('paciente-1', 'sol-1')).rejects.toBeInstanceOf(
        TrackingNoDisponibleError,
      );
    });

    it('lanza NoAutorizadoError si no es paciente/domiciliario/admin del pedido', async () => {
      (tracking.obtenerPosicion as jest.Mock).mockResolvedValue({ resultado: 'no_autorizado' });

      await expect(obtener.execute('intruso', 'sol-1')).rejects.toBeInstanceOf(NoAutorizadoError);
    });
  });
});
