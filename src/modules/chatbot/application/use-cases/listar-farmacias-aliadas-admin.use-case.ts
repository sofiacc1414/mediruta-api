import { Injectable } from '@nestjs/common';
import { FarmaciaAliadaAdmin } from '../../domain/farmacia-aliada';
import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';

@Injectable()
export class ListarFarmaciasAliadasAdminUseCase {
  constructor(private readonly farmacias: FarmaciaAliadaRepositoryPort) {}

  execute(adminId: string): Promise<FarmaciaAliadaAdmin[]> {
    return this.farmacias.listarAdmin(adminId);
  }
}
