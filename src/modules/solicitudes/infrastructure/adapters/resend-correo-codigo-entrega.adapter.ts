import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { CorreoCodigoEntregaPort } from '../../domain/ports/correo-codigo-entrega.port';

export const ASUNTO_CODIGO_ENTREGA = 'Tu código de entrega | MediRuta';

export const ERROR_ENVIO_CORREO_CODIGO_ENTREGA =
  'No fue posible enviar el correo con el código de entrega mediante el proveedor configurado.';

/** HU-07 (ronda 3) — mismo patrón que `ResendCorreoRecuperacionAdapter`
 * (usuarios): un adaptador por puerto, sin compartir cliente Resend
 * entre módulos (cada uno con su propia instancia, misma config). */
@Injectable()
export class ResendCorreoCodigoEntregaAdapter extends CorreoCodigoEntregaPort {
  private readonly logger = new Logger(ResendCorreoCodigoEntregaAdapter.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(config: ConfigService) {
    super();
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('Falta la variable de entorno RESEND_API_KEY.');
    }

    const fromEmail = config.get<string>('RESEND_FROM_EMAIL');
    if (!fromEmail) {
      throw new Error('Falta la variable de entorno RESEND_FROM_EMAIL.');
    }

    this.fromEmail = fromEmail;
    this.resend = new Resend(apiKey);
  }

  async enviarCodigoEntrega(
    correo: string,
    nombrePaciente: string | null,
    codigoPedido: string | null,
    codigoEntrega: string,
  ): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: correo,
        subject: ASUNTO_CODIGO_ENTREGA,
        html: plantillaHtml(nombrePaciente, codigoPedido, codigoEntrega),
        text: plantillaTexto(nombrePaciente, codigoPedido, codigoEntrega),
      });

      if (error) {
        this.registrarFallo();
        throw new Error(ERROR_ENVIO_CORREO_CODIGO_ENTREGA);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === ERROR_ENVIO_CORREO_CODIGO_ENTREGA
      ) {
        throw error;
      }

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
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#567C8D;">MediRuta</p>
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
