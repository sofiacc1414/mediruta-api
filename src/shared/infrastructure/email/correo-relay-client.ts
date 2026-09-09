import { ConfigService } from '@nestjs/config';

export type CorreoAEnviar = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const TIMEOUT_MS = 12000;

/**
 * Cliente del relay de correo — reemplaza el envío SMTP directo desde
 * acá. Render bloquea el tráfico saliente a los puertos SMTP (25, 465,
 * 587) en sus servicios web del plan gratis desde septiembre 2025
 * (https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)
 * — confirmado en producción: un envío por Gmail SMTP directo se
 * quedaba colgado sin responder nunca.
 *
 * `CORREO_RELAY_URL` apunta a `api/enviar-correo.ts` (función
 * serverless en el proyecto de Vercel de mediruta-web) — Vercel sí
 * permite salida por 465/587, así que ese relay hace el envío SMTP
 * real. Esta API solo habla HTTPS con él (443, nunca bloqueado — ya
 * probado con Resend antes de este cambio).
 */
export async function enviarCorreoViaRelay(
  config: ConfigService,
  correo: CorreoAEnviar,
): Promise<void> {
  const url = config.get<string>('CORREO_RELAY_URL');
  if (!url) {
    throw new Error('Falta la variable de entorno CORREO_RELAY_URL.');
  }
  const secreto = config.get<string>('CORREO_RELAY_SECRET');
  if (!secreto) {
    throw new Error('Falta la variable de entorno CORREO_RELAY_SECRET.');
  }

  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Secret': secreto,
      },
      body: JSON.stringify(correo),
      signal: controlador.signal,
    });
  } catch (error) {
    throw new Error(
      `No se pudo contactar al relay de correo: ${(error as Error).message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text().catch(() => '');
    throw new Error(`El relay de correo respondió ${respuesta.status}: ${cuerpo}`);
  }
}
