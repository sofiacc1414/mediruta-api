import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_CONFIGURACION_ACTUALIZADA =
  'Se actualizó el umbral de demora.';

export type ActualizarConfiguracionAdminResultado = { message: string };

/** Panel admin — cambiar el umbral (en minutos) que dispara la alarma
 * de "pedido demorado sin domiciliario" (ver `FiltrosPedidosAdmin` /
 * `PedidoAdmin.enAsignacionDesde`, que el front compara contra esto). */
@Injectable()
export class ActualizarConfiguracionAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    adminId: string,
    umbralMinutos: number,
  ): Promise<ActualizarConfiguracionAdminResultado> {
    const resultado = await this.solicitudes.actualizarConfiguracionAdmin(
      adminId,
      umbralMinutos,
    );

    switch (resultado) {
      case 'actualizado':
        return { message: MENSAJE_CONFIGURACION_ACTUALIZADA };
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'invalido':
        throw new Error('El umbral debe ser un número de minutos mayor a 0.');
    }
  }
}
