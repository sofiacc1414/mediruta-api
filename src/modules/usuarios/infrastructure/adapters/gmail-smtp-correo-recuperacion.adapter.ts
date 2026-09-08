import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { crearTransporteGmail } from '../../../../shared/infrastructure/email/gmail-smtp-transporter';
import { CorreoRecuperacionPort } from '../../domain/ports/correo-recuperacion.port';

export const ASUNTO_RECUPERACION_CONTRASENA =
  'Código para recuperar tu contraseña | MediRuta';

export const ERROR_ENVIO_CORREO_RECUPERACION =
  'No fue posible enviar un correo de recuperación mediante el proveedor configurado.';

const OTP_PATTERN = /^\d{6}$/;

/** Reemplaza a `ResendCorreoRecuperacionAdapter` — Resend en modo
 * sandbox (sin dominio propio verificado) solo entregaba al dueño de
 * la cuenta, así que la recuperación de contraseña nunca le llegaba a
 * un usuario real. Gmail SMTP no tiene esa restricción. */
@Injectable()
export class GmailSmtpCorreoRecuperacionAdapter extends CorreoRecuperacionPort {
  private readonly logger = new Logger(
    GmailSmtpCorreoRecuperacionAdapter.name,
  );
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor(config: ConfigService) {
    super();
    this.transporter = crearTransporteGmail(config);
    this.fromEmail = `MediRuta <${config.get<string>('GMAIL_SMTP_USER')}>`;
  }

  async enviarCodigoRecuperacion(
    correo: string,
    codigo: string,
  ): Promise<void> {
    const otp = otpSeguro(codigo);

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: correo,
        subject: ASUNTO_RECUPERACION_CONTRASENA,
        html: plantillaHtml(otp),
        text: plantillaTexto(otp),
      });
    } catch {
      this.registrarFallo();
      throw new Error(ERROR_ENVIO_CORREO_RECUPERACION);
    }
  }

  private registrarFallo(): void {
    this.logger.error(ERROR_ENVIO_CORREO_RECUPERACION);
  }
}

function otpSeguro(codigo: string): string {
  if (!OTP_PATTERN.test(codigo)) {
    throw new Error('El código de recuperación no tiene el formato esperado.');
  }
  return codigo;
}

function plantillaHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#F5EFEB;color:#2F4156;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:8px;">
      <tr>
        <td style="padding:32px 28px;">
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#567C8D;">MediRuta</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Recuperar contraseña</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">
            Tu código de recuperación es:
          </p>
          <p style="margin:0 0 20px;padding:16px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;background:#C8D9E6;border-radius:8px;">
            ${otp}
          </p>
          <p style="margin:0 0 8px;font-size:15px;line-height:1.5;">
            Este código vence en 10 minutos y solo puede utilizarse una vez.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.5;color:#567C8D;">
            Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function plantillaTexto(otp: string): string {
  return [
    'MediRuta',
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta.',
    '',
    `Tu código de recuperación es: ${otp}`,
    '',
    'Este código vence en 10 minutos y solo puede utilizarse una vez.',
    '',
    'Si no solicitaste este cambio, puedes ignorar este correo.',
  ].join('\n');
}
