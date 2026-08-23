import type { CookieOptions } from 'express';
import { parsearDuracion } from '../adapters/parsear-duracion';

/**
 * Nombre de la cookie HttpOnly donde viaja el refresh token del flujo Web
 * (context.md sección 4.1 — nunca localStorage ni JS del navegador).
 */
export const REFRESH_COOKIE_NAME = 'mediruta_refresh_token';

/**
 * Valor esperado del header `X-Client-Type` que manda el Web para indicar
 * que quiere el refresh token por cookie en vez de en el body JSON.
 */
export function esClienteWeb(headerValue: string | undefined): boolean {
  return headerValue === 'web';
}

/**
 * Opciones de la cookie de refresh token. `secure`/`sameSite` dependen de
 * NODE_ENV porque en producción Web (Vercel) y API (Render) están en
 * dominios distintos — hace falta `SameSite=None; Secure` para que el
 * navegador la reenvíe cross-site. En desarrollo local (mismo `localhost`,
 * distinto puerto) alcanza con `Lax` sin `Secure` (no hay HTTPS local).
 */
export function opcionesCookieRefresh(): CookieOptions {
  const enProduccion = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    path: '/auth',
    secure: enProduccion,
    sameSite: enProduccion ? 'none' : 'lax',
    maxAge: parsearDuracion(
      process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      'JWT_REFRESH_EXPIRES_IN',
    ),
  };
}
