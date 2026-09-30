import { Injectable } from '@nestjs/common';
import { SolicitudNoEncontradaError } from '../../../solicitudes/domain/errors/solicitud-no-encontrada.error';
import { NoAutorizadoError } from '../../../usuarios/domain/errors/no-autorizado.error';
import { TrackingNoDisponibleError } from '../../domain/errors/tracking-no-disponible.error';
import { PosicionEnVivo, TrackingRepositoryPort } from '../../domain/ports/tracking.repository.port';

/** Llamado al abrir el mapa (`tracking:suscribir`) — Paciente,
 * Domiciliario del pedido, o Admin/Root (único caso de este proyecto
 * donde el chequeo de rol vive en la función SQL: no hay un
 * `RolesGuard` de Nest delante de un gateway de WebSocket). */
@Injectable()
export class ObtenerPosicionEnVivoUseCase {
  constructor(private readonly tracking: TrackingRepositoryPort) {}

  async execute(usuarioId: string, solicitudId: string): Promise<PosicionEnVivo> {
    const resultado = await this.tracking.obtenerPosicion(usuarioId, solicitudId);
    switch (resultado.resultado) {
      case 'ok':
        return resultado.posicion;
      case 'pedido_no_encontrado':
        throw new SolicitudNoEncontradaError();
      case 'sin_tracking_disponible':
        throw new TrackingNoDisponibleError();
      case 'no_autorizado':
        throw new NoAutorizadoError();
    }
  }
}
