/** G01/G03 — fila agregada de comportamiento de un domiciliario para
 * un periodo dado. */
export type ResumenComportamientoDomiciliario = {
  domiciliarioId: string;
  nombreCompleto: string;
  correo: string;
  estadoCuenta: 'activa' | 'bloqueada' | 'desactivada';
  entregasRealizadas: number;
  cancelaciones: number;
  incidentesReportados: number;
  incidentesAbiertos: number;
  /** `null` si no hubo calificaciones en el periodo (no confundir con
   * 0, que sería la peor calificación posible). */
  calificacionPromedio: number | null;
  calificacionesCantidad: number;
  /** Siempre `null`: no existe en el sistema un evento de "domiciliario
   * rechaza un pedido ofrecido" — el modelo de asignación es por
   * aceptar primero, sin oferta explícita que se pueda rechazar.
   * Se deja el campo a propósito en `null` (no 0) para que la UI lo
   * muestre como "no disponible" y no como "cero rechazos reales". */
  rechazos: null;
};

/** G02 — un evento puntual en la línea de tiempo de un domiciliario.
 * `codigoPedido` es el código legible del pedido (ej. "MR-000042"),
 * no un número — ver `app.enviar_solicitud`. */
export type EventoComportamiento =
  | {
      tipo: 'entrega';
      solicitudId: string;
      codigoPedido: string | null;
      fecha: string;
    }
  | {
      tipo: 'cancelacion';
      solicitudId: string;
      codigoPedido: string | null;
      fecha: string;
    }
  | {
      tipo: 'incidente';
      solicitudId: string;
      codigoPedido: string | null;
      detalle: string;
      resuelto: boolean;
      fecha: string;
    }
  | {
      tipo: 'calificacion';
      solicitudId: string;
      codigoPedido: string | null;
      puntuacion: number;
      comentario: string | null;
      fecha: string;
    };

/** G02 — detalle completo que ve el admin al seleccionar un
 * domiciliario: su resumen + la línea de tiempo de eventos del
 * periodo, de más reciente a más antiguo. */
export type DetalleComportamientoDomiciliario = {
  resumen: ResumenComportamientoDomiciliario;
  eventos: EventoComportamiento[];
};
