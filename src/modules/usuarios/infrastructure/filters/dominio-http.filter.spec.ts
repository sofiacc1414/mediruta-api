import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { CredencialesInvalidasError } from '../../domain/errors/credenciales-invalidas.error';
import { NoAutorizadoError } from '../../domain/errors/no-autorizado.error';
import { RefreshTokenInvalidoError } from '../../domain/errors/refresh-token-invalido.error';
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
});
