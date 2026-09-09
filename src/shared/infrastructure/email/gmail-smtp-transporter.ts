import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Transportador SMTP de Gmail, compartido por los adaptadores de correo
 * (recuperación de contraseña, código de entrega) — Resend exigía un
 * dominio propio verificado para poder enviar a cualquier destinatario
 * (en modo sandbox solo entregaba al dueño de la cuenta); Gmail SMTP no
 * tiene esa restricción, a costa de peor entregabilidad (más chance de
 * spam) y el límite de envíos diarios de una cuenta Gmail normal
 * (~500/día) — suficiente para el volumen actual del proyecto.
 *
 * `GMAIL_SMTP_APP_PASSWORD` es una "contraseña de aplicación" (no la
 * contraseña normal de la cuenta) — se genera en
 * myaccount.google.com/apppasswords, requiere verificación en 2 pasos
 * activada en esa cuenta.
 */
export function crearTransporteGmail(
  config: ConfigService,
): nodemailer.Transporter {
  const usuario = config.get<string>('GMAIL_SMTP_USER');
  if (!usuario) {
    throw new Error('Falta la variable de entorno GMAIL_SMTP_USER.');
  }

  const appPassword = config.get<string>('GMAIL_SMTP_APP_PASSWORD');
  if (!appPassword) {
    throw new Error('Falta la variable de entorno GMAIL_SMTP_APP_PASSWORD.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: usuario, pass: appPassword },
    // Sin esto, un bloqueo de salida SMTP en el hosting (algunos
    // planes de Render/Heroku/etc. bloquean el puerto saliente sin
    // devolver ni un RST) deja la conexión colgada varios minutos —
    // el request HTTP entero (y el spinner del cliente) se queda
    // esperando indefinidamente en vez de fallar rápido con un error
    // claro. 8-10s alcanza de sobra para un handshake SMTP normal.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}
