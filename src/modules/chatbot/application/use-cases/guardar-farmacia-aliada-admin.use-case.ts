import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { FarmaciaAliadaNoEncontradaError } from '../../domain/errors/farmacia-aliada-no-encontrada.error';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';

export type GuardarFarmaciaAliadaAdminResultado = { id: string };

/** Panel admin — crea (id `null`) o actualiza (id presente) una
 * farmacia del catálogo de aliadas por EPS. */
@Injectable()
export class GuardarFarmaciaAliadaAdminUseCase {
  constructor(private readonly farmacias: FarmaciaAliadaRepositoryPort) {}

  async execute(
    adminId: string,
    id: string | null,
    eps: string,
    nombreFarmacia: string,
    ciudad: string,
    departamento: string | null,
    direccion: string | null,
    telefono: string | null,
    activo: boolean,
  ): Promise<GuardarFarmaciaAliadaAdminResultado> {
    const resultado = await this.farmacias.guardarAdmin(
      adminId,
      id,
      eps,
      nombreFarmacia,
      ciudad,
      departamento,
      direccion,
      telefono,
      activo,
    );

    if (resultado.resultado === 'guardado') {
      return { id: resultado.id };
    }
    if (resultado.resultado === 'no_autorizado') {
      throw new RolNoAutorizadoError();
    }
    if (resultado.resultado === 'no_encontrado') {
      throw new FarmaciaAliadaNoEncontradaError();
    }
    throw new Error('La EPS, el nombre de la farmacia y la ciudad son obligatorios.');
  }
}
