import { Injectable } from '@nestjs/common';
import { Calificacion } from '../../domain/calificacion';
import { lanzarSiResultadoInvalido } from '../../domain/interpretar-resultado';
import { CalificacionRepositoryPort } from '../../domain/ports/calificacion.repository.port';

/** G01 — crea la calificación activa de un pedido entregado propio. */
@Injectable()
export class CrearCalificacionUseCase {
  constructor(private readonly calificaciones: CalificacionRepositoryPort) {}

  async execute(datos: {
    usuarioId: string;
    solicitudId: string;
    puntuacion: number;
    comentario: string | null;
  }): Promise<Calificacion> {
    const resultado = await this.calificaciones.crear(datos);
    lanzarSiResultadoInvalido(resultado.codigo);
    return resultado.calificacion!;
  }
}
