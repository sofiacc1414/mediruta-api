import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import {
  ASUNTO_RECUPERACION_CONTRASENA,
  ERROR_ENVIO_CORREO_RECUPERACION,
  ResendCorreoRecuperacionAdapter,
} from './resend-correo-recuperacion.adapter';

jest.mock('resend');

const sendMock = jest.fn();

function configCon(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
}

const configValida = {
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'MediRuta <onboarding@resend.dev>',
};

describe('ResendCorreoRecuperacionAdapter', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    (Resend as unknown as jest.Mock).mockReset();
    (Resend as unknown as jest.Mock).mockImplementation(() => ({
      emails: { send: sendMock },
    }));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('usa RESEND_API_KEY y RESEND_FROM_EMAIL configurados', async () => {
    const adapter = new ResendCorreoRecuperacionAdapter(configCon(configValida));

    await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');

    expect(Resend).toHaveBeenCalledWith('re_test_key');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'MediRuta <onboarding@resend.dev>',
        to: 'persona@mail.com',
        subject: ASUNTO_RECUPERACION_CONTRASENA,
      }),
    );
  });

  it('incluye el OTP y la expiración de 10 minutos en HTML y texto', async () => {
    const adapter = new ResendCorreoRecuperacionAdapter(configCon(configValida));

    await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');

    const payload = sendMock.mock.calls[0][0] as {
      html: string;
      text: string;
    };

    expect(payload.html).toContain('000042');
    expect(payload.html).toContain('10 minutos');
    expect(payload.html).toContain('MediRuta');
    expect(payload.text).toContain('000042');
    expect(payload.text).toContain('10 minutos');
    expect(payload.html).not.toContain('re_test_key');
    expect(payload.text).not.toContain('re_test_key');
  });

  it('si Resend retorna error, falla de forma genérica', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'rate_limit', name: 'application_error' },
    });
    const adapter = new ResendCorreoRecuperacionAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      ERROR_ENVIO_CORREO_RECUPERACION,
    );
  });

  it('si el SDK lanza, falla de forma genérica', async () => {
    sendMock.mockRejectedValue(new Error('socket hang up'));
    const adapter = new ResendCorreoRecuperacionAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);
  });

  it('el error genérico no incluye OTP ni API key', async () => {
    sendMock.mockRejectedValue(new Error('socket hang up'));
    const adapter = new ResendCorreoRecuperacionAdapter(configCon(configValida));

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);

    try {
      await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      expect(message).not.toContain('000042');
      expect(message).not.toContain('re_test_key');
      expect(message).not.toContain('persona@mail.com');
    }
  });

  it('falla al inicializar si falta RESEND_API_KEY', () => {
    expect(
      () =>
        new ResendCorreoRecuperacionAdapter(
          configCon({ RESEND_FROM_EMAIL: configValida.RESEND_FROM_EMAIL }),
        ),
    ).toThrow('Falta la variable de entorno RESEND_API_KEY.');
  });

  it('falla al inicializar si RESEND_API_KEY está vacía', () => {
    expect(
      () =>
        new ResendCorreoRecuperacionAdapter(
          configCon({
            RESEND_API_KEY: '',
            RESEND_FROM_EMAIL: configValida.RESEND_FROM_EMAIL,
          }),
        ),
    ).toThrow('Falta la variable de entorno RESEND_API_KEY.');
  });

  it('falla al inicializar si falta RESEND_FROM_EMAIL', () => {
    expect(
      () =>
        new ResendCorreoRecuperacionAdapter(
          configCon({ RESEND_API_KEY: configValida.RESEND_API_KEY }),
        ),
    ).toThrow('Falta la variable de entorno RESEND_FROM_EMAIL.');
  });

  it('falla al inicializar si RESEND_FROM_EMAIL está vacía', () => {
    expect(
      () =>
        new ResendCorreoRecuperacionAdapter(
          configCon({
            RESEND_API_KEY: configValida.RESEND_API_KEY,
            RESEND_FROM_EMAIL: '',
          }),
        ),
    ).toThrow('Falta la variable de entorno RESEND_FROM_EMAIL.');
  });
});
