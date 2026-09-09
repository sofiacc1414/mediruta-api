import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  ASUNTO_RECUPERACION_CONTRASENA,
  ERROR_ENVIO_CORREO_RECUPERACION,
  CorreoRelayRecuperacionAdapter,
} from './correo-relay-recuperacion.adapter';

const fetchMock = jest.fn();

function configCon(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
}

const configValida = {
  CORREO_RELAY_URL: 'https://mediruta-web.vercel.app/api/enviar-correo',
  CORREO_RELAY_SECRET: 'secreto-test',
};

describe('CorreoRelayRecuperacionAdapter', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('llama al relay con la URL, el secreto y el correo armado', async () => {
    const adapter = new CorreoRelayRecuperacionAdapter(configCon(configValida));

    await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');

    expect(fetchMock).toHaveBeenCalledWith(
      configValida.CORREO_RELAY_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Relay-Secret': 'secreto-test',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(body.to).toBe('persona@mail.com');
    expect(body.subject).toBe(ASUNTO_RECUPERACION_CONTRASENA);
  });

  it('incluye el OTP y la expiración de 10 minutos en HTML y texto', async () => {
    const adapter = new CorreoRelayRecuperacionAdapter(configCon(configValida));

    await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      html: string;
      text: string;
    };
    expect(body.html).toContain('000042');
    expect(body.html).toContain('10 minutos');
    expect(body.html).toContain('MediRuta');
    expect(body.text).toContain('000042');
    expect(body.text).toContain('10 minutos');
    expect(body.html).not.toContain('secreto-test');
    expect(body.text).not.toContain('secreto-test');
  });

  it('si el relay responde con error, el error propagado es genérico', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, text: async () => 'ETIMEDOUT' });
    const adapter = new CorreoRelayRecuperacionAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(ERROR_ENVIO_CORREO_RECUPERACION),
    );
  });

  it('si la llamada HTTP falla (red), el error propagado es genérico', async () => {
    fetchMock.mockRejectedValue(new Error('fetch failed'));
    const adapter = new CorreoRelayRecuperacionAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);
  });

  it('el error genérico no incluye OTP ni el secreto del relay', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, text: async () => 'boom' });
    const adapter = new CorreoRelayRecuperacionAdapter(configCon(configValida));

    try {
      await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      expect(message).not.toContain('000042');
      expect(message).not.toContain('secreto-test');
      expect(message).not.toContain('persona@mail.com');
    }
  });

  it('falla al enviar si falta CORREO_RELAY_URL', async () => {
    const adapter = new CorreoRelayRecuperacionAdapter(
      configCon({ CORREO_RELAY_SECRET: configValida.CORREO_RELAY_SECRET }),
    );

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falla al enviar si falta CORREO_RELAY_SECRET', async () => {
    const adapter = new CorreoRelayRecuperacionAdapter(
      configCon({ CORREO_RELAY_URL: configValida.CORREO_RELAY_URL }),
    );

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propaga el error de formato si el código no son 6 dígitos', async () => {
    const adapter = new CorreoRelayRecuperacionAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', 'abc'),
    ).rejects.toThrow('El código de recuperación no tiene el formato esperado.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
