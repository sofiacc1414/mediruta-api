import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  ASUNTO_RECUPERACION_CONTRASENA,
  ERROR_ENVIO_CORREO_RECUPERACION,
  GmailSmtpCorreoRecuperacionAdapter,
} from './gmail-smtp-correo-recuperacion.adapter';

jest.mock('nodemailer');

const sendMailMock = jest.fn();

function configCon(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
}

const configValida = {
  GMAIL_SMTP_USER: 'sofiacc1414@gmail.com',
  GMAIL_SMTP_APP_PASSWORD: 'app-password-test',
};

describe('GmailSmtpCorreoRecuperacionAdapter', () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue({ messageId: 'msg-id' });
    (nodemailer.createTransport as jest.Mock).mockReset();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('crea el transporte con GMAIL_SMTP_USER/GMAIL_SMTP_APP_PASSWORD y manda desde ese correo', async () => {
    const adapter = new GmailSmtpCorreoRecuperacionAdapter(
      configCon(configValida),
    );

    await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'gmail',
        auth: { user: 'sofiacc1414@gmail.com', pass: 'app-password-test' },
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'MediRuta <sofiacc1414@gmail.com>',
        to: 'persona@mail.com',
        subject: ASUNTO_RECUPERACION_CONTRASENA,
      }),
    );
  });

  it('incluye el OTP y la expiración de 10 minutos en HTML y texto', async () => {
    const adapter = new GmailSmtpCorreoRecuperacionAdapter(
      configCon(configValida),
    );

    await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');

    const payload = sendMailMock.mock.calls[0][0] as {
      html: string;
      text: string;
    };

    expect(payload.html).toContain('000042');
    expect(payload.html).toContain('10 minutos');
    expect(payload.html).toContain('MediRuta');
    expect(payload.text).toContain('000042');
    expect(payload.text).toContain('10 minutos');
    expect(payload.html).not.toContain('app-password-test');
    expect(payload.text).not.toContain('app-password-test');
  });

  it('si el envío falla, el error es genérico', async () => {
    sendMailMock.mockRejectedValue(new Error('ECONNECTION'));
    const adapter = new GmailSmtpCorreoRecuperacionAdapter(
      configCon(configValida),
    );

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', '000042'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_RECUPERACION);

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      ERROR_ENVIO_CORREO_RECUPERACION,
    );
  });

  it('el error genérico no incluye OTP ni la contraseña de aplicación', async () => {
    sendMailMock.mockRejectedValue(new Error('ECONNECTION'));
    const adapter = new GmailSmtpCorreoRecuperacionAdapter(
      configCon(configValida),
    );

    try {
      await adapter.enviarCodigoRecuperacion('persona@mail.com', '000042');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      expect(message).not.toContain('000042');
      expect(message).not.toContain('app-password-test');
      expect(message).not.toContain('persona@mail.com');
    }
  });

  it('falla al inicializar si falta GMAIL_SMTP_USER', () => {
    expect(
      () =>
        new GmailSmtpCorreoRecuperacionAdapter(
          configCon({ GMAIL_SMTP_APP_PASSWORD: configValida.GMAIL_SMTP_APP_PASSWORD }),
        ),
    ).toThrow('Falta la variable de entorno GMAIL_SMTP_USER.');
  });

  it('falla al inicializar si falta GMAIL_SMTP_APP_PASSWORD', () => {
    expect(
      () =>
        new GmailSmtpCorreoRecuperacionAdapter(
          configCon({ GMAIL_SMTP_USER: configValida.GMAIL_SMTP_USER }),
        ),
    ).toThrow('Falta la variable de entorno GMAIL_SMTP_APP_PASSWORD.');
  });

  it('propaga el error de formato si el código no son 6 dígitos', async () => {
    const adapter = new GmailSmtpCorreoRecuperacionAdapter(
      configCon(configValida),
    );

    await expect(
      adapter.enviarCodigoRecuperacion('persona@mail.com', 'abc'),
    ).rejects.toThrow('El código de recuperación no tiene el formato esperado.');
    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
