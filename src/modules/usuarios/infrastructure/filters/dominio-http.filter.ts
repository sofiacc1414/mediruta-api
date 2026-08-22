import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { TipoRegistroInvalidoError } from '../../domain/errors/tipo-registro-invalido.error';

@Catch(
  CorreoYaRegistradoError,
  TipoRegistroInvalidoError,
  CredencialesInvalidasError,
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

    if (exception instanceof CredencialesInvalidasError) {
      response.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: exception.message,
      });
      return;
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
    });
  }
}
