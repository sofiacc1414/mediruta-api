import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { NivelCopagoNoEncontradoError } from '../../../usuarios/domain/errors/nivel-copago-no-encontrado.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';

export type GuardarNivelCopagoAdminResultado = { id: string };

/** Panel admin — crea (id `null`) o actualiza (id presente) un nivel
 * del catálogo de copago. `invalido` cubre nombre vacío o copago
 * negativo, validado también en la fila (constraint `copago >= 0`). */
@Injectable()
export class GuardarNivelCopagoAdminUseCase {
  constructor(private readonly solicitudes: SolicitudRepositoryPort) {}

  async execute(
    adminId: string,
    id: string | null,
    nombre: string,
    copago: number,
    orden: number,
  ): Promise<GuardarNivelCopagoAdminResultado> {
    const resultado = await this.solicitudes.guardarNivelCopagoAdmin(
      adminId,
      id,
      nombre,
      copago,
      orden,
    );

    if (resultado.resultado === 'guardado') {
      return { id: resultado.id };
    }
    if (resultado.resultado === 'no_autorizado') {
      throw new RolNoAutorizadoError();
    }
    if (resultado.resultado === 'no_encontrado') {
      throw new NivelCopagoNoEncontradoError();
    }
    throw new Error('El nombre y el copago (≥ 0) son obligatorios.');
  }
}
