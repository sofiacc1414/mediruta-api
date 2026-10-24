import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import {
  AvisoPush,
  PushNotificacionPort,
} from '../../domain/ports/push-notificacion.port';

/**
 * FCM HTTP v1 vía firebase-admin. La API legacy (`fcm.googleapis.com/fcm/send`
 * con `FCM_SERVER_KEY`) fue dada de baja por Google en junio de 2024; v1
 * autentica con una cuenta de servicio (OAuth2) en vez de una server key.
 * Sin `FIREBASE_SERVICE_ACCOUNT_JSON` o sin tokens, no envía y no
 * interrumpe el flujo de negocio que lo llama (mismo contrato que antes).
 */
@Injectable()
export class FcmPushAdapter extends PushNotificacionPort {
  private readonly logger = new Logger(FcmPushAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async enviar(aviso: AvisoPush): Promise<void> {
    if (aviso.tokens.length === 0) {
      this.logger.debug('Push omitido: sin dispositivos registrados.');
      return;
    }

    const app = this.obtenerApp();
    if (!app) {
      this.logger.debug(
        'Push omitido: sin credenciales de Firebase configuradas.',
      );
      return;
    }

    const respuesta = await getMessaging(app).sendEachForMulticast({
      tokens: aviso.tokens,
      notification: { title: aviso.titulo, body: aviso.mensaje },
      data: {
        referenciaTipo: aviso.referenciaTipo,
        referenciaId: aviso.referenciaId ?? '',
      },
    });

    for (const r of respuesta.responses) {
      if (!r.success) {
        this.logger.warn(
          `FCM no entregó el push a un dispositivo: ${r.error?.message ?? 'error desconocido'}`,
        );
      }
    }
  }

  /** `getApps()[0]` evita reinicializar si Nest llega a crear más de una
   * instancia del adapter (hot-reload, testing). */
  private obtenerApp(): App | null {
    const json = this.config
      .get<string>('FIREBASE_SERVICE_ACCOUNT_JSON')
      ?.trim();
    if (!json) return null;

    try {
      const cuenta = JSON.parse(json) as ServiceAccount;
      return getApps()[0] ?? initializeApp({ credential: cert(cuenta) });
    } catch (error) {
      this.logger.warn(
        `No se pudo inicializar Firebase Admin: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
