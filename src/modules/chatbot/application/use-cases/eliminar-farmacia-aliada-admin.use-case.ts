import { Injectable } from '@nestjs/common';
import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { FarmaciaAliadaNoEncontradaError } from '../../domain/errors/farmacia-aliada-no-encontrada.error';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';

export const MENSAJE_FARMACIA_ALIADA_ELIMINADA = 'Farmacia aliada eliminada.';

@Injectable()
export class EliminarFarmaciaAliadaAdminUseCase {
  constructor(private readonly farmacias: FarmaciaAliadaRepositoryPort) {}

  async execute(adminId: string, id: string): Promise<{ message: string }> {
    const resultado = await this.farmacias.eliminarAdmin(adminId, id);

    switch (resultado) {
      case 'eliminado':
        return { message: MENSAJE_FARMACIA_ALIADA_ELIMINADA };
      case 'no_autorizado':
        throw new RolNoAutorizadoError();
      case 'no_encontrado':
        throw new FarmaciaAliadaNoEncontradaError();
    }
  }
}
