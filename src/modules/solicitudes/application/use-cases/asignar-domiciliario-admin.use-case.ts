import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { DomiciliarioNoDisponibleParaAsignarError } from '../../domain/errors/domiciliario-no-disponible-para-asignar.error';
import { PedidoYaAsignadoError } from '../../domain/errors/pedido-ya-asignado.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_DOMICILIARIO_ASIGNADO =
  'El domiciliario fue asignado al pedido.';

export type AsignarDomiciliarioAdminResultado = { message: string };

/** Panel admin — asignación manual de un pedido demorado (mismo
 * criterio de transición que cuando el propio domiciliario acepta su
 * pedido, ver `AceptarPedidoUseCase`). */
@Injectable()
export class AsignarDomiciliarioAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    adminId: string,
    solicitudId: string,
    domiciliarioId: string,
  ): Promise<AsignarDomiciliarioAdminResultado> {
    const resultado = await this.solicitudes.asignarDomiciliarioAdmin(
      adminId,
      solicitudId,
      domiciliarioId,
    );

    switch (resultado) {
      case 'asignado':
        return { message: MENSAJE_DOMICILIARIO_ASIGNADO };
      case 'ya_asignado':
        throw new PedidoYaAsignadoError();
      case 'no_encontrado':
        throw new SolicitudNoEncontradaError();
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'domiciliario_no_disponible':
        throw new DomiciliarioNoDisponibleParaAsignarError();
    }
  }
}
