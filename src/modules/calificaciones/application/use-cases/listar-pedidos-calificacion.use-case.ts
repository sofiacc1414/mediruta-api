import { Injectable } from '@nestjs/common';
import { PedidoCalificacion } from '../../domain/calificacion';
import { CalificacionRepositoryPort } from '../../domain/ports/calificacion.repository.port';

/** Lista los pedidos del paciente para la pantalla de calificación (HU-18). */
@Injectable()
export class ListarPedidosCalificacionUseCase {
  constructor(private readonly calificaciones: CalificacionRepositoryPort) {}

  execute(usuarioId: string): Promise<PedidoCalificacion[]> {
    return this.calificaciones.listarPedidos(usuarioId);
  }
}
