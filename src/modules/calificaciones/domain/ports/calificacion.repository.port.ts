import {
  Calificacion,
  CodigoResultadoCalificacion,
  PedidoCalificacion,
} from '../calificacion';

export type GuardarCalificacion = {
  usuarioId: string;
  solicitudId: string;
  puntuacion: number;
  comentario: string | null;
};

export type ResultadoMutacion = {
  codigo: CodigoResultadoCalificacion;
  calificacion: Calificacion | null;
};

export abstract class CalificacionRepositoryPort {
  abstract listarPedidos(usuarioId: string): Promise<PedidoCalificacion[]>;
  abstract obtener(
    usuarioId: string,
    solicitudId: string,
  ): Promise<ResultadoMutacion>;
  abstract crear(datos: GuardarCalificacion): Promise<ResultadoMutacion>;
  abstract actualizar(datos: GuardarCalificacion): Promise<ResultadoMutacion>;
  abstract retirar(
    usuarioId: string,
    solicitudId: string,
  ): Promise<CodigoResultadoCalificacion>;
}
