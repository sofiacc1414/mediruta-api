import { Injectable } from '@nestjs/common';
import { lanzarSiResultadoInvalido } from '../../domain/interpretar-resultado';
import { CalificacionRepositoryPort } from '../../domain/ports/calificacion.repository.port';

/** G04 — marca la calificación como retirada y conserva el registro mínimo. */
@Injectable()
export class RetirarCalificacionUseCase {
  constructor(private readonly calificaciones: CalificacionRepositoryPort) {}

  async execute(usuarioId: string, solicitudId: string): Promise<void> {
    const codigo = await this.calificaciones.retirar(usuarioId, solicitudId);
    lanzarSiResultadoInvalido(codigo);
  }
}
