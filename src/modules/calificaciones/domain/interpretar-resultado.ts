import { CodigoResultadoCalificacion } from './calificacion';
import {
  CalificacionActivaExistenteError,
  CalificacionInvalidaError,
  CalificacionNoAutorizadaError,
  CalificacionNoEncontradaError,
  PedidoAjenoError,
  PedidoCalificacionNoEncontradoError,
  PedidoNoEntregadoError,
} from './errors/calificacion.errors';

export function lanzarSiResultadoInvalido(
  codigo: CodigoResultadoCalificacion,
): void {
  switch (codigo) {
    case 'ok':
      return;
    case 'no_autorizado':
      throw new CalificacionNoAutorizadaError();
    case 'pedido_no_encontrado':
      throw new PedidoCalificacionNoEncontradoError();
    case 'pedido_ajeno':
      throw new PedidoAjenoError();
    case 'pedido_no_entregado':
      throw new PedidoNoEntregadoError();
    case 'calificacion_activa':
      throw new CalificacionActivaExistenteError();
    case 'sin_calificacion':
      throw new CalificacionNoEncontradaError();
    case 'puntuacion_invalida':
      throw new CalificacionInvalidaError('La puntuación debe estar entre 1 y 5.');
    case 'comentario_invalido':
      throw new CalificacionInvalidaError(
        'El comentario no puede superar 300 caracteres.',
      );
    default:
      throw new CalificacionInvalidaError('No se pudo registrar la calificación.');
  }
}
