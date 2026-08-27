import { Injectable } from '@nestjs/common';
import {
  ConfiguracionAdmin,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** Panel admin — umbral configurable de "pedido demorado". */
@Injectable()
export class ObtenerConfiguracionAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(adminId: string): Promise<ConfiguracionAdmin> {
    const configuracion =
      await this.solicitudes.obtenerConfiguracionAdmin(adminId);
    if (!configuracion) {
      // No debería pasar: `RolesGuard` ya exige Administrador/Root antes
      // de llegar acá, y la fila singleton siempre existe (sembrada en
      // la migración).
      throw new Error('No se pudo leer la configuración del panel admin.');
    }
    return configuracion;
  }
}
