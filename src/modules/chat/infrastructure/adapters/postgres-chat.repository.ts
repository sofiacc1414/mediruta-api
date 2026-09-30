import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  ChatRepositoryPort,
  MensajeChat,
  ResultadoEnviarMensaje,
  ResultadoObtenerChat,
  RolRemitenteChat,
} from '../../domain/ports/chat.repository.port';

function instante(valor: string | Date): string {
  return valor instanceof Date ? valor.toISOString() : valor;
}

function instanteONull(valor: string | Date | null): string | null {
  return valor === null ? null : instante(valor);
}

type FilaObtenerChat = {
  resultado: 'ok' | 'no_autorizado' | 'pedido_no_encontrado' | 'sin_domiciliario_asignado';
  chat_id: string | null;
  solo_lectura: boolean | null;
};

type FilaEnviarMensaje = {
  resultado: 'ok' | 'no_autorizado' | 'chat_no_encontrado' | 'chat_solo_lectura' | 'contenido_vacio';
  id: string | null;
  chat_id: string | null;
  remitente_id: string | null;
  rol_remitente: RolRemitenteChat | null;
  contenido: string | null;
  creado_en: string | Date | null;
  destinatario_id: string | null;
  solicitud_id: string | null;
};

type FilaMensaje = {
  id: string;
  chat_id?: string;
  remitente_id: string;
  rol_remitente: RolRemitenteChat;
  contenido: string;
  creado_en: string | Date;
  leido_en: string | Date | null;
};

function mensajeDesde(fila: FilaMensaje, chatIdRespaldo: string): MensajeChat {
  return {
    id: fila.id,
    chatId: fila.chat_id ?? chatIdRespaldo,
    remitenteId: fila.remitente_id,
    rolRemitente: fila.rol_remitente,
    contenido: fila.contenido,
    creadoEn: instante(fila.creado_en),
    leidoEn: instanteONull(fila.leido_en),
  };
}

@Injectable()
export class PostgresChatRepository extends ChatRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async obtenerOCrearChat(
    usuarioId: string,
    solicitudId: string,
  ): Promise<ResultadoObtenerChat> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaObtenerChat>(
        'select * from app.obtener_o_crear_chat_pedido($1, $2)',
        [usuarioId, solicitudId],
      );
      const fila = result.rows[0];
      if (fila.resultado !== 'ok') {
        return { resultado: fila.resultado };
      }
      return {
        resultado: 'ok',
        chat: { chatId: fila.chat_id!, soloLectura: fila.solo_lectura! },
      };
    });
  }

  async enviarMensaje(
    usuarioId: string,
    chatId: string,
    contenido: string,
  ): Promise<ResultadoEnviarMensaje> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaEnviarMensaje>(
        'select * from app.enviar_mensaje_chat($1, $2, $3)',
        [usuarioId, chatId, contenido],
      );
      const fila = result.rows[0];
      if (fila.resultado !== 'ok') {
        return { resultado: fila.resultado };
      }
      return {
        resultado: 'ok',
        mensaje: {
          id: fila.id!,
          chatId: fila.chat_id!,
          remitenteId: fila.remitente_id!,
          rolRemitente: fila.rol_remitente!,
          contenido: fila.contenido!,
          creadoEn: instante(fila.creado_en!),
          leidoEn: null,
        },
        destinatarioId: fila.destinatario_id!,
        solicitudId: fila.solicitud_id!,
      };
    });
  }

  async listarMensajes(usuarioId: string, chatId: string): Promise<MensajeChat[]> {
    return this.db.withUserContext(usuarioId, async (client) => {
      const result = await client.query<FilaMensaje>(
        'select * from app.listar_mensajes_chat($1, $2)',
        [usuarioId, chatId],
      );
      return result.rows.map((fila) => mensajeDesde(fila, chatId));
    });
  }

  async marcarMensajesLeidos(usuarioId: string, chatId: string): Promise<void> {
    await this.db.withUserContext(usuarioId, async (client) => {
      await client.query('select app.marcar_mensajes_leidos_chat($1, $2)', [
        usuarioId,
        chatId,
      ]);
    });
  }

  async listarMensajesAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<MensajeChat[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaMensaje>(
        'select * from app.listar_mensajes_chat_admin($1)',
        [solicitudId],
      );
      return result.rows.map((fila) => mensajeDesde(fila, ''));
    });
  }
}
