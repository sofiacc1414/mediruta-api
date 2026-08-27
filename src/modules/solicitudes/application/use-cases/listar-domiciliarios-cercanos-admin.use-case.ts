import { Injectable } from '@nestjs/common';
import {
  DomiciliarioCercanoAdmin,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** Panel admin — "pedido demorado, asignar alguien": delegación fina. */
@Injectable()
export class ListarDomiciliariosCercanosAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(
    adminId: string,
    solicitudId: string,
  ): Promise<DomiciliarioCercanoAdmin[]> {
    return this.solicitudes.listarDomiciliariosCercanosAdmin(
      adminId,
      solicitudId,
    );
  }
}
