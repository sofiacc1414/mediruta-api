import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DocumentacionIncompletaError } from '../../../domiciliarios/domain/errors/documentacion-incompleta.error';
import { DomiciliarioNoEncontradoError } from '../../../domiciliarios/domain/errors/domiciliario-no-encontrado.error';
import { CambioContrasenaInvalidoError } from '../../domain/errors/cambio-contrasena-invalido.error';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { NuevaContrasenaIgualError } from '../../domain/errors/nueva-contrasena-igual.error';
import { RecuperacionInvalidaError } from '../../domain/errors/recuperacion-invalida.error';
import { RefreshTokenInvalidoError } from '../../domain/errors/refresh-token-invalido.error';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { TipoRegistroInvalidoError } from '../../domain/errors/tipo-registro-invalido.error';

@Catch(
  CorreoYaRegistradoError,
  TipoRegistroInvalidoError,
  CredencialesInvalidasError,
  RefreshTokenInvalidoError,
  NoAutorizadoError,
  RecuperacionInvalidaError,
  CambioContrasenaInvalidoError,
  NuevaContrasenaIgualError,
  RolNoAutorizadoError,
  DocumentacionIncompletaError,
  DomiciliarioNoEncontradoError,
)
export class DominioHttpFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof CorreoYaRegistradoError) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: exception.message,
      });
      return;
    }

    if (
      exception instanceof CredencialesInvalidasError ||
      exception instanceof RefreshTokenInvalidoError ||
      exception instanceof NoAutorizadoError
    ) {
      response.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof RolNoAutorizadoError) {
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof DomiciliarioNoEncontradoError) {
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof DocumentacionIncompletaError) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: exception.message,
        faltantes: exception.faltantes,
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
    });
  }
}
