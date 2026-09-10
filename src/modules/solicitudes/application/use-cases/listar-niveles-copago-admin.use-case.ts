import { Injectable } from '@nestjs/common';
import {
  NivelCopagoAdmin,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';

/** Panel admin — catálogo completo de niveles de copago (mismo dato que
 * `ListarNivelesCopagoUseCase` del lado Paciente, pero exigiendo rol
 * admin). */
@Injectable()
export class ListarNivelesCopagoAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  execute(adminId: string): Promise<NivelCopagoAdmin[]> {
    return this.solicitudes.listarNivelesCopagoAdmin(adminId);
  }
}
