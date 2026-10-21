import { Injectable } from '@nestjs/common';
import { FarmaciaAliada } from '../../domain/farmacia-aliada';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';

/** CA1 del chatbot — "¿cuáles son las farmacias de mi EPS?". */
@Injectable()
export class ListarFarmaciasAliadasPorEpsUseCase {
  constructor(private readonly farmacias: FarmaciaAliadaRepositoryPort) {}

  execute(usuarioId: string, eps: string): Promise<FarmaciaAliada[]> {
    return this.farmacias.listarPorEps(usuarioId, eps);
  }
}
