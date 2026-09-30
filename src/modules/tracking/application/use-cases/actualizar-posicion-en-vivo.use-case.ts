import { Injectable } from '@nestjs/common';
import { NoAutorizadoError } from '../../../usuarios/domain/errors/no-autorizado.error';
import { PedidoNoEnCaminoError } from '../../domain/errors/pedido-no-en-camino.error';
import { TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';

/** Llamado desde `TrackingGateway` en cada ping del domiciliario
 * (`tracking:enviar_posicion`). Solo escribe mientras el pedido está
 * `en_camino_entrega` — la función SQL ya lo valida, acá solo se
 * traduce el resultado discriminado a excepciones de dominio. */
@Injectable()
export class ActualizarPosicionEnVivoUseCase {
  constructor(private readonly tracking: TrackingRepositoryPort) {}

  async execute(
    domiciliarioId: string,
    solicitudId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    const resultado = await this.tracking.actualizarUbicacion(domiciliarioId, solicitudId, lat, lng);
    switch (resultado) {
      case 'ok':
        return;
      case 'pedido_no_en_camino':
        throw new PedidoNoEnCaminoError();
      case 'no_autorizado':
        throw new NoAutorizadoError();
    }
  }
}
