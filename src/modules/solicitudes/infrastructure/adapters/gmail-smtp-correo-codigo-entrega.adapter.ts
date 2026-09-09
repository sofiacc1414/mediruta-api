import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { crearTransporteGmail } from '../../../../shared/infrastructure/email/gmail-smtp-transporter';
import { CorreoCodigoEntregaPort } from '../../domain/ports/correo-codigo-entrega.port';

export const ASUNTO_CODIGO_ENTREGA = 'Tu código de entrega | MediRuta';

export const ERROR_ENVIO_CORREO_CODIGO_ENTREGA =
  'No fue posible enviar el correo con el código de entrega mediante el proveedor configurado.';

// Ver comentario de LOGO_URL en gmail-smtp-correo-recuperacion.adapter.ts.
const LOGO_URL = 'https://mediruta-web.vercel.app/logo-mediruta.png';

/** Reemplaza a `ResendCorreoCodigoEntregaAdapter` — mismo motivo que
 * `GmailSmtpCorreoRecuperacionAdapter` (Resend en modo sandbox solo
 * entregaba al dueño de la cuenta). */
@Injectable()
export class GmailSmtpCorreoCodigoEntregaAdapter extends CorreoCodigoEntregaPort {
  private readonly logger = new Logger(
    GmailSmtpCorreoCodigoEntregaAdapter.name,
  );
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor(config: ConfigService) {
    super();
    this.transporter = crearTransporteGmail(config);
    this.fromEmail = `MediRuta <${config.get<string>('GMAIL_SMTP_USER')}>`;
  }

  async enviarCodigoEntrega(
    correo: string,
    nombrePaciente: string | null,
    codigoPedido: string | null,
    codigoEntrega: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: correo,
        subject: ASUNTO_CODIGO_ENTREGA,
        html: plantillaHtml(nombrePaciente, codigoPedido, codigoEntrega),
        text: plantillaTexto(nombrePaciente, codigoPedido, codigoEntrega),
      });
    } catch {
      this.registrarFallo();
      throw new Error(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);
    }
  }

  private registrarFallo(): void {
    this.logger.error(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);
  }
}

function plantillaHtml(
  nombrePaciente: string | null,
  codigoPedido: string | null,
  codigoEntrega: string,
): string {
  const saludo = nombrePaciente ? `Hola ${nombrePaciente},` : 'Hola,';
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#F5EFEB;color:#2F4156;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:8px;">
      <tr>
        <td style="padding:32px 28px;">
          <div style="text-align:center;margin:0 0 20px;">
            <img src="${LOGO_URL}" alt="MediRuta" width="120" style="display:inline-block;border:0;" />
          </div>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Tu código de entrega</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
            ${saludo} este es el código que debés dictarle a tu domiciliario al recibir tu pedido${
              codigoPedido ? ` (${codigoPedido})` : ''
            }:
          </p>
          <p style="margin:0 0 20px;padding:16px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;background:#C8D9E6;border-radius:8px;">
            ${codigoEntrega}
          </p>
          <p style="margin:0;font-size:15px;line-height:1.5;color:#567C8D;">
            Guardalo hasta que tu pedido llegue.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function plantillaTexto(
  nombrePaciente: string | null,
  codigoPedido: string | null,
  codigoEntrega: string,
): string {
  const saludo = nombrePaciente ? `Hola ${nombrePaciente},` : 'Hola,';
  return [
    'MediRuta',
    '',
    `${saludo} este es el código que debés dictarle a tu domiciliario al recibir tu pedido${
      codigoPedido ? ` (${codigoPedido})` : ''
    }:`,
    '',
    `Código de entrega: ${codigoEntrega}`,
    '',
    'Guardalo hasta que tu pedido llegue.',
  ].join('\n');
}
