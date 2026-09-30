export type TipoNotificacion =
  | 'cambio_estado'
  | 'asignacion'
  | 'validacion_cuenta'
  | 'mensaje_chat';
export type ReferenciaNotificacion = 'pedido' | 'cuenta';

export type NotificacionGuardada = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string | null;
  leida: boolean;
  creadoEn: string;
};

export type NuevaNotificacion = {
  destinatarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  referenciaTipo: ReferenciaNotificacion;
  referenciaId: string | null;
  claveEvento: string;
};

export type DatosPedidoNotificacion = {
  pacienteId: string;
  domiciliarioId: string | null;
  estado: string;
  codigoPedido: string | null;
};

export abstract class NotificacionRepositoryPort {
  abstract guardar(datos: NuevaNotificacion): Promise<string | null>;
  abstract listar(usuarioId: string): Promise<NotificacionGuardada[]>;
  abstract marcarLeida(usuarioId: string, notificacionId: string): Promise<boolean>;
  abstract datosPedido(solicitudId: string): Promise<DatosPedidoNotificacion | null>;
  abstract tokensPush(usuarioId: string): Promise<string[]>;
  abstract registrarDispositivo(
    usuarioId: string,
    token: string,
    plataforma: string,
  ): Promise<void>;
}
