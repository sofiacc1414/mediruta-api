import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  ASUNTO_CODIGO_ENTREGA,
  ERROR_ENVIO_CORREO_CODIGO_ENTREGA,
  GmailSmtpCorreoCodigoEntregaAdapter,
} from './gmail-smtp-correo-codigo-entrega.adapter';

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

describe('GmailSmtpCorreoCodigoEntregaAdapter', () => {
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
    const adapter = new GmailSmtpCorreoCodigoEntregaAdapter(
      configCon(configValida),
    );

    await adapter.enviarCodigoEntrega(
      'persona@mail.com',
      'Sofía',
      'MR-000123',
      'ABC123',
    );

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
        subject: ASUNTO_CODIGO_ENTREGA,
      }),
    );
  });

  it('incluye nombre, código de pedido y código de entrega en HTML y texto', async () => {
    const adapter = new GmailSmtpCorreoCodigoEntregaAdapter(
      configCon(configValida),
    );

    await adapter.enviarCodigoEntrega(
      'persona@mail.com',
      'Sofía',
      'MR-000123',
      'ABC123',
    );

    const payload = sendMailMock.mock.calls[0][0] as {
      html: string;
      text: string;
    };

    expect(payload.html).toContain('Sofía');
    expect(payload.html).toContain('MR-000123');
    expect(payload.html).toContain('ABC123');
    expect(payload.text).toContain('Sofía');
    expect(payload.text).toContain('ABC123');
  });

  it('si el envío falla, el error es genérico', async () => {
    sendMailMock.mockRejectedValue(new Error('ECONNECTION'));
    const adapter = new GmailSmtpCorreoCodigoEntregaAdapter(
      configCon(configValida),
    );

    await expect(
      adapter.enviarCodigoEntrega('persona@mail.com', null, null, 'ABC123'),
    ).rejects.toThrow(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining(ERROR_ENVIO_CORREO_CODIGO_ENTREGA),
    );
  });

  it('falla al inicializar si falta GMAIL_SMTP_USER', () => {
    expect(
      () =>
        new GmailSmtpCorreoCodigoEntregaAdapter(
          configCon({ GMAIL_SMTP_APP_PASSWORD: configValida.GMAIL_SMTP_APP_PASSWORD }),
        ),
    ).toThrow('Falta la variable de entorno GMAIL_SMTP_USER.');
  });

  it('falla al inicializar si falta GMAIL_SMTP_APP_PASSWORD', () => {
    expect(
      () =>
        new GmailSmtpCorreoCodigoEntregaAdapter(
          configCon({ GMAIL_SMTP_USER: configValida.GMAIL_SMTP_USER }),
        ),
    ).toThrow('Falta la variable de entorno GMAIL_SMTP_APP_PASSWORD.');
  });
});
