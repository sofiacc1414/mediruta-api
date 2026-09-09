import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  ASUNTO_CODIGO_ENTREGA,
  ERROR_ENVIO_CORREO_CODIGO_ENTREGA,
  CorreoRelayCodigoEntregaAdapter,
} from './correo-relay-codigo-entrega.adapter';

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

describe('CorreoRelayCodigoEntregaAdapter', () => {
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
    const adapter = new CorreoRelayCodigoEntregaAdapter(configCon(configValida));

    await adapter.enviarCodigoEntrega('persona@mail.com', 'Sofía', 'MR-000123', 'ABC123');

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
    };
    expect(body.to).toBe('persona@mail.com');
    expect(body.subject).toBe(ASUNTO_CODIGO_ENTREGA);
  });

  it('incluye nombre, código de pedido y código de entrega en HTML y texto', async () => {
    const adapter = new CorreoRelayCodigoEntregaAdapter(configCon(configValida));

    await adapter.enviarCodigoEntrega('persona@mail.com', 'Sofía', 'MR-000123', 'ABC123');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      html: string;
      text: string;
    };
    expect(body.html).toContain('Sofía');
    expect(body.html).toContain('MR-000123');
    expect(body.html).toContain('ABC123');
    expect(body.text).toContain('Sofía');
    expect(body.text).toContain('ABC123');
  });

  it('si el relay responde con error, el error propagado es genérico', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, text: async () => 'ETIMEDOUT' });
    const adapter = new CorreoRelayCodigoEntregaAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoEntrega('persona@mail.com', null, null, 'ABC123'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(ERROR_ENVIO_CORREO_CODIGO_ENTREGA),
    );
  });

  it('falla al enviar si falta CORREO_RELAY_URL', async () => {
    const adapter = new CorreoRelayCodigoEntregaAdapter(
      configCon({ CORREO_RELAY_SECRET: configValida.CORREO_RELAY_SECRET }),
    );

    await expect(
      adapter.enviarCodigoEntrega('persona@mail.com', null, null, 'ABC123'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falla al enviar si falta CORREO_RELAY_SECRET', async () => {
    const adapter = new CorreoRelayCodigoEntregaAdapter(
      configCon({ CORREO_RELAY_URL: configValida.CORREO_RELAY_URL }),
    );

    await expect(
      adapter.enviarCodigoEntrega('persona@mail.com', null, null, 'ABC123'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
