import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  CalificacionActivaExistenteError,
  CalificacionInvalidaError,
  CalificacionNoAutorizadaError,
  CalificacionNoEncontradaError,
  PedidoAjenoError,
  PedidoCalificacionNoEncontradoError,
  PedidoNoEntregadoError,
} from '../../domain/errors/calificacion.errors';

@Catch(
  CalificacionNoAutorizadaError,
  PedidoCalificacionNoEncontradoError,
  PedidoAjenoError,
  PedidoNoEntregadoError,
  CalificacionActivaExistenteError,
  CalificacionNoEncontradaError,
  CalificacionInvalidaError,
)
export class CalificacionHttpFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (
      exception instanceof CalificacionNoAutorizadaError ||
      exception instanceof PedidoAjenoError
    ) {
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: exception.message,
        codigo:
          exception instanceof PedidoAjenoError ? 'pedido_ajeno' : 'no_autorizado',
      });
      return;
    }

    if (
      exception instanceof PedidoCalificacionNoEncontradoError ||
      exception instanceof CalificacionNoEncontradaError
    ) {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
        codigo:
          exception instanceof CalificacionNoEncontradaError
            ? 'sin_calificacion'
            : 'pedido_no_encontrado',
      });
      return;
    }

    if (exception instanceof PedidoNoEntregadoError) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        codigo: 'pedido_no_entregado',
      });
      return;
    }

    if (exception instanceof CalificacionActivaExistenteError) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
        codigo: 'calificacion_activa',
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
    });
  }
}
