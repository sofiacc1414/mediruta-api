import { Injectable } from '@nestjs/common';
import { Calificacion } from '../../domain/calificacion';
import { lanzarSiResultadoInvalido } from '../../domain/interpretar-resultado';
import { CalificacionRepositoryPort } from '../../domain/ports/calificacion.repository.port';

/** G02 — la calificación activa solo la ve el paciente dueño del pedido. */
@Injectable()
export class ConsultarCalificacionUseCase {
  constructor(private readonly calificaciones: CalificacionRepositoryPort) {}

  async execute(usuarioId: string, solicitudId: string): Promise<Calificacion> {
    const resultado = await this.calificaciones.obtener(usuarioId, solicitudId);
    lanzarSiResultadoInvalido(resultado.codigo);
    return resultado.calificacion!;
  }
}
