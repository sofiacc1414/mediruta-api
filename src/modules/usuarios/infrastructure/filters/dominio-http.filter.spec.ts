import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { CorreoYaRegistradoError } from '../../domain/errors/correo-ya-registrado.error';
import { DominioHttpFilter } from './dominio-http.filter';

describe('DominioHttpFilter', () => {
  it('mapea CorreoYaRegistradoError a HTTP 409', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    new DominioHttpFilter().catch(new CorreoYaRegistradoError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Ya existe una cuenta registrada con este correo.',
    });
  });
});
