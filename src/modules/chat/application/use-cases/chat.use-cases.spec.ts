import { RegistrarNotificacionUseCase } from '../../../notificaciones/application/use-cases/registrar-notificacion.use-case';
import { NotificacionRepositoryPort } from '../../../notificaciones/domain/ports/notificacion.repository.port';
import { PushNotificacionPort } from '../../../notificaciones/domain/ports/push-notificacion.port';
import { SolicitudNoEncontradaError } from '../../../solicitudes/domain/errors/solicitud-no-encontrada.error';
import { NoAutorizadoError } from '../../../usuarios/domain/errors/no-autorizado.error';
import { ChatSinDomiciliarioAsignadoError } from '../../domain/errors/chat-sin-domiciliario-asignado.error';
import { ChatSoloLecturaError } from '../../domain/errors/chat-solo-lectura.error';
import { ChatRepositoryPort, MensajeChat } from '../../domain/ports/chat.repository.port';
import { EnviarMensajeChatUseCase } from './enviar-mensaje-chat.use-case';
import { ListarMensajesChatAdminUseCase } from './listar-mensajes-chat-admin.use-case';
import { ListarMensajesChatUseCase } from './listar-mensajes-chat.use-case';
import { MarcarMensajesLeidosChatUseCase } from './marcar-mensajes-leidos-chat.use-case';
import { ObtenerChatPedidoUseCase } from './obtener-chat-pedido.use-case';

const mensaje: MensajeChat = {
  id: 'msg-1',
  chatId: 'chat-1',
  remitenteId: 'paciente-1',
  rolRemitente: 'PACIENTE',
  contenido: 'Ya salgo para la farmacia',
  creadoEn: '2026-09-30T10:00:00.000Z',
  leidoEn: null,
};

describe('Chat en tiempo real — HU chat', () => {
  const chats: ChatRepositoryPort = {
    obtenerOCrearChat: jest.fn(),
    enviarMensaje: jest.fn(),
    listarMensajes: jest.fn(),
    marcarMensajesLeidos: jest.fn(),
    listarMensajesAdmin: jest.fn(),
  };
  const notificaciones: NotificacionRepositoryPort = {
    guardar: jest.fn(),
    listar: jest.fn(),
    marcarLeida: jest.fn(),
    datosPedido: jest.fn(),
    tokensPush: jest.fn(),
    registrarDispositivo: jest.fn(),
  };
  const push: PushNotificacionPort = { enviar: jest.fn() };
  const registrarNotificacion = new RegistrarNotificacionUseCase(notificaciones, push);

  const obtenerChat = new ObtenerChatPedidoUseCase(chats);
  const enviarMensaje = new EnviarMensajeChatUseCase(chats, registrarNotificacion);
  const listarMensajes = new ListarMensajesChatUseCase(chats);
  const marcarLeidos = new MarcarMensajesLeidosChatUseCase(chats);
  const listarMensajesAdmin = new ListarMensajesChatAdminUseCase(chats);

  beforeEach(() => {
    jest.resetAllMocks();
    (notificaciones.guardar as jest.Mock).mockResolvedValue('notif-1');
    (notificaciones.tokensPush as jest.Mock).mockResolvedValue([]);
  });

  describe('ObtenerChatPedidoUseCase', () => {
    it('devuelve el chat cuando el resultado es ok', async () => {
      (chats.obtenerOCrearChat as jest.Mock).mockResolvedValue({
        resultado: 'ok',
        chat: { chatId: 'chat-1', soloLectura: false },
      });

      const resultado = await obtenerChat.execute('paciente-1', 'sol-1');

      expect(resultado).toEqual({ chatId: 'chat-1', soloLectura: false });
      expect(chats.obtenerOCrearChat).toHaveBeenCalledWith('paciente-1', 'sol-1');
    });

    it('lanza SolicitudNoEncontradaError si el pedido no existe/no es propio', async () => {
      (chats.obtenerOCrearChat as jest.Mock).mockResolvedValue({
        resultado: 'pedido_no_encontrado',
      });

      await expect(obtenerChat.execute('paciente-1', 'sol-1')).rejects.toBeInstanceOf(
        SolicitudNoEncontradaError,
      );
    });

    it('lanza ChatSinDomiciliarioAsignadoError si el pedido todavía no tiene domiciliario', async () => {
      (chats.obtenerOCrearChat as jest.Mock).mockResolvedValue({
        resultado: 'sin_domiciliario_asignado',
      });

      await expect(obtenerChat.execute('paciente-1', 'sol-1')).rejects.toBeInstanceOf(
        ChatSinDomiciliarioAsignadoError,
      );
    });

    it('lanza NoAutorizadoError si el usuario no es paciente ni domiciliario de ese pedido', async () => {
      (chats.obtenerOCrearChat as jest.Mock).mockResolvedValue({ resultado: 'no_autorizado' });

      await expect(obtenerChat.execute('otro-usuario', 'sol-1')).rejects.toBeInstanceOf(
        NoAutorizadoError,
      );
    });
  });

  describe('EnviarMensajeChatUseCase', () => {
    it('guarda el mensaje y notifica por push al destinatario', async () => {
      (chats.enviarMensaje as jest.Mock).mockResolvedValue({
        resultado: 'ok',
        mensaje,
        destinatarioId: 'domiciliario-1',
        solicitudId: 'sol-1',
      });

      const resultado = await enviarMensaje.execute('paciente-1', 'chat-1', 'Ya salgo');

      expect(resultado).toEqual(mensaje);
      expect(notificaciones.guardar).toHaveBeenCalledWith(
        expect.objectContaining({
          destinatarioId: 'domiciliario-1',
          tipo: 'mensaje_chat',
          referenciaTipo: 'pedido',
          referenciaId: 'sol-1',
          claveEvento: mensaje.id,
        }),
      );
    });

    it('no revienta el envío si falla la notificación (best-effort)', async () => {
      (chats.enviarMensaje as jest.Mock).mockResolvedValue({
        resultado: 'ok',
        mensaje,
        destinatarioId: 'domiciliario-1',
        solicitudId: 'sol-1',
      });
      (notificaciones.guardar as jest.Mock).mockRejectedValue(new Error('db caída'));

      await expect(
        enviarMensaje.execute('paciente-1', 'chat-1', 'Ya salgo'),
      ).resolves.toEqual(mensaje);
    });

    it('lanza ChatSoloLecturaError si ya pasaron los 30 minutos, sin notificar', async () => {
      (chats.enviarMensaje as jest.Mock).mockResolvedValue({ resultado: 'chat_solo_lectura' });

      await expect(
        enviarMensaje.execute('paciente-1', 'chat-1', 'Hola'),
      ).rejects.toBeInstanceOf(ChatSoloLecturaError);
      expect(notificaciones.guardar).not.toHaveBeenCalled();
    });

    it('lanza SolicitudNoEncontradaError si el chat no existe', async () => {
      (chats.enviarMensaje as jest.Mock).mockResolvedValue({ resultado: 'chat_no_encontrado' });

      await expect(
        enviarMensaje.execute('paciente-1', 'chat-inexistente', 'Hola'),
      ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
    });

    it('lanza NoAutorizadoError si el usuario no es parte de ese chat', async () => {
      (chats.enviarMensaje as jest.Mock).mockResolvedValue({ resultado: 'no_autorizado' });

      await expect(
        enviarMensaje.execute('intruso', 'chat-1', 'Hola'),
      ).rejects.toBeInstanceOf(NoAutorizadoError);
    });
  });

  describe('ListarMensajesChatUseCase / MarcarMensajesLeidosChatUseCase / ListarMensajesChatAdminUseCase', () => {
    it('delega el listado en el repositorio', async () => {
      (chats.listarMensajes as jest.Mock).mockResolvedValue([mensaje]);

      const resultado = await listarMensajes.execute('paciente-1', 'chat-1');

      expect(resultado).toEqual([mensaje]);
      expect(chats.listarMensajes).toHaveBeenCalledWith('paciente-1', 'chat-1');
    });

    it('delega marcar como leídos en el repositorio', async () => {
      await marcarLeidos.execute('paciente-1', 'chat-1');

      expect(chats.marcarMensajesLeidos).toHaveBeenCalledWith('paciente-1', 'chat-1');
    });

    it('delega la auditoría del admin en el repositorio', async () => {
      (chats.listarMensajesAdmin as jest.Mock).mockResolvedValue([mensaje]);

      const resultado = await listarMensajesAdmin.execute('admin-1', 'sol-1');

      expect(resultado).toEqual([mensaje]);
      expect(chats.listarMensajesAdmin).toHaveBeenCalledWith('admin-1', 'sol-1');
    });
  });
});
