import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { NivelCopagoEnUsoError } from '../../../usuarios/domain/errors/nivel-copago-en-uso.error';
import { NivelCopagoNoEncontradoError } from '../../../usuarios/domain/errors/nivel-copago-no-encontrado.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export const MENSAJE_NIVEL_COPAGO_ELIMINADO = 'Nivel de copago eliminado.';

/** Panel admin — elimina un nivel del catálogo (solo si ningún
 * Paciente lo tiene declarado). */
@Injectable()
export class EliminarNivelCopagoAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(adminId: string, id: string): Promise<{ message: string }> {
    const resultado = await this.solicitudes.eliminarNivelCopagoAdmin(
      adminId,
      id,
    );

    switch (resultado) {
      case 'eliminado':
        return { message: MENSAJE_NIVEL_COPAGO_ELIMINADO };
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'en_uso':
        throw new NivelCopagoEnUsoError();
      case 'no_encontrado':
        throw new NivelCopagoNoEncontradoError();
    }
  }
}
