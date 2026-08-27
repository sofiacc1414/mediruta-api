import { Injectable } from '@nestjs/common';
import {
  FiltrosPedidosAdmin,
  PedidoAdmin,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** Panel admin — "ver y filtrar pedidos" (estado, rango de fechas,
 * búsqueda libre por código o datos del paciente). Delegación fina —
 * los filtros ya vienen validados/normalizados del DTO. */
@Injectable()
export class ListarPedidosAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(
    adminId: string,
    filtros: FiltrosPedidosAdmin,
  ): Promise<PedidoAdmin[]> {
    return this.solicitudes.listarPedidosAdmin(adminId, filtros);
  }
}
