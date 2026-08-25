import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { CambioContrasenaInvalidoError } from '../../domain/errors/cambio-contrasena-invalido.error';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { NuevaContrasenaIgualError } from '../../domain/errors/nueva-contrasena-igual.error';
import { RecuperacionInvalidaError } from '../../domain/errors/recuperacion-invalida.error';
import { RefreshTokenInvalidoError } from '../../domain/errors/refresh-token-invalido.error';
import { CodigoEntregaIncorrectoError } from '../../../solicitudes/domain/errors/codigo-entrega-incorrecto.error';
import { DomiciliarioConPedidoActivoError } from '../../../solicitudes/domain/errors/domiciliario-con-pedido-activo.error';
import { PedidoYaAsignadoError } from '../../../solicitudes/domain/errors/pedido-ya-asignado.error';
import { DominioHttpFilter } from './dominio-http.filter';

function hostConRespuesta() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('DominioHttpFilter', () => {
  it('mapea CorreoYaRegistradoError a HTTP 409', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new CorreoYaRegistradoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Ya existe una cuenta registrada con este correo.',
    });
  });

  it('mapea CredencialesInvalidasError a HTTP 401 con mensaje genérico', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new CredencialesInvalidasError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Correo o contraseña incorrectos, o la cuenta no está disponible.',
    });
  });

  it('mapea RefreshTokenInvalidoError a HTTP 401 con mensaje genérico', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new RefreshTokenInvalidoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'La sesión no es válida o ha expirado.',
    });
  });

  it('mapea NoAutorizadoError a HTTP 401 con mensaje genérico', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new NoAutorizadoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'No autorizado.',
    });
  });

  it('mapea RecuperacionInvalidaError a HTTP 400 con mensaje genérico', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new RecuperacionInvalidaError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'El código de recuperación no es válido o ya no está disponible.',
    });
  });

  it('mapea CambioContrasenaInvalidoError a HTTP 400 con mensaje genérico', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new CambioContrasenaInvalidoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message:
        'No fue posible cambiar la contraseña con las credenciales proporcionadas.',
    });
  });

  it('mapea NuevaContrasenaIgualError a HTTP 400', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new NuevaContrasenaIgualError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'La nueva contraseña debe ser diferente de la contraseña actual.',
    });
  });

  it('mapea PedidoYaAsignadoError a HTTP 409', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new PedidoYaAsignadoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Ese pedido ya fue asignado a otro domiciliario.',
    });
  });

  it('mapea DomiciliarioConPedidoActivoError a HTTP 409', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new DomiciliarioConPedidoActivoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Ya tenés un pedido activo — entregalo antes de aceptar otro.',
    });
  });

  it('mapea CodigoEntregaIncorrectoError a HTTP 400', () => {
    const { host, json, status } = hostConRespuesta();

    new DominioHttpFilter().catch(new CodigoEntregaIncorrectoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'El código de entrega no coincide.',
    });
  });
});
