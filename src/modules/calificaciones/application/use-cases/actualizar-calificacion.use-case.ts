import { Injectable } from '@nestjs/common';
import { Calificacion } from '../../domain/calificacion';
import { lanzarSiResultadoInvalido } from '../../domain/interpretar-resultado';
import { CalificacionRepositoryPort } from '../../domain/ports/calificacion.repository.port';

/** G03 — solo el dueño actualiza su calificación activa. */
@Injectable()
export class ActualizarCalificacionUseCase {
  constructor(private readonly calificaciones: CalificacionRepositoryPort) {}

  async execute(datos: {
    usuarioId: string;
    solicitudId: string;
    puntuacion: number;
    comentario: string | null;
  }): Promise<Calificacion> {
    const resultado = await this.calificaciones.actualizar(datos);
    lanzarSiResultadoInvalido(resultado.codigo);
    return resultado.calificacion!;
  }
}
