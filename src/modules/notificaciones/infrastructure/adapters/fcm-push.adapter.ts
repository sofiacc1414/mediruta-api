import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AvisoPush,
  PushNotificacionPort,
} from '../../domain/ports/push-notificacion.port';

/**
 * FCM HTTP legacy. Compatible con Flutter (`firebase_messaging`) cuando
 * haya `google-services` y un token registrado. Sin `FCM_SERVER_KEY`
 * o sin tokens, no envía y no interrumpe el flujo.
 */
@Injectable()
export class FcmPushAdapter extends PushNotificacionPort {
  private readonly logger = new Logger(FcmPushAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async enviar(aviso: AvisoPush): Promise<void> {
    const clave = this.config.get<string>('FCM_SERVER_KEY')?.trim();
    if (!clave || aviso.tokens.length === 0) {
      this.logger.debug(
        'Push omitido: sin FCM_SERVER_KEY o sin dispositivos registrados.',
      );
      return;
    }

    for (const token of aviso.tokens) {
      const respuesta = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${clave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: { title: aviso.titulo, body: aviso.mensaje },
          data: {
            referenciaTipo: aviso.referenciaTipo,
            referenciaId: aviso.referenciaId ?? '',
          },
        }),
      });
      if (!respuesta.ok) {
        this.logger.warn(
          `FCM respondió ${respuesta.status} para un dispositivo.`,
        );
      }
    }
  }
}
