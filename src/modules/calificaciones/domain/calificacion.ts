export type EstadoCalificacion = 'activa' | 'retirada';

export type CodigoResultadoCalificacion =
  | 'ok'
  | 'no_autorizado'
  | 'pedido_no_encontrado'
  | 'pedido_ajeno'
  | 'pedido_no_entregado'
  | 'calificacion_activa'
  | 'sin_calificacion'
  | 'puntuacion_invalida'
  | 'comentario_invalido';

export type Calificacion = {
  id: string;
  solicitudId: string;
  puntuacion: number;
  comentario: string | null;
  estado: EstadoCalificacion;
  creadoEn: string;
  actualizadoEn: string;
};

export type PedidoCalificacion = {
  id: string;
  codigoPedido: string | null;
  estado: string;
  creadoEn: string;
  cantidadMedicamentos: number;
  tieneCalificacionActiva: boolean;
};

export type FilaCalificacion = {
  resultado: CodigoResultadoCalificacion;
  id: string | null;
  solicitud_id: string | null;
  puntuacion: number | null;
  comentario: string | null;
  estado: EstadoCalificacion | null;
  creado_en: string | Date | null;
  actualizado_en: string | Date | null;
};
