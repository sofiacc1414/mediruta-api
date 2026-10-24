import { Injectable } from '@nestjs/common';
import { ComportamientoDomiciliarioRepositoryPort } from '../../domain/ports/comportamiento-domiciliario.repository.port';
import { ResumenComportamientoDomiciliario } from '../../domain/comportamiento-domiciliario';

/** G01/G03 — panel admin: comportamiento de todos los domiciliarios
 * habilitados, recalculado para el rango de fechas elegido. */
@Injectable()
export class ListarResumenComportamientoAdminUseCase {
  constructor(
    private readonly comportamiento: ComportamientoDomiciliarioRepositoryPort,
  ) {}

  execute(
    adminId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenComportamientoDomiciliario[]> {
    return this.comportamiento.listarResumen(adminId, desde, hasta);
  }
}
