/** HU-13 G05 — el texto que sale al usuario. Solo evento, estado y
 * referencia. Sin receta, medicamentos, cédula ni documentos. */

export const TITULO_MAX = 80;
export const MENSAJE_MAX = 180;

const PROHIBIDOS = [
  'receta',
  'cedula',
  'cédula',
  'medicamento',
  'diagnostico',
  'diagnóstico',
  'documento',
  'fotografia',
  'fotografía',
  'http://',
  'https://',
];

export type EtiquetaEstadoPedido =
  | 'Recibido'
  | 'Validado'
  | 'Preparado'
  | 'Asignado'
  | 'En farmacia'
  | 'En camino'
  | 'Entregado'
  | 'Cancelado';

const ETIQUETA_POR_ESTADO: Record<string, EtiquetaEstadoPedido> = {
  pendiente_revision: 'Recibido',
  en_asignacion: 'Validado',
  asignado_en_camino_farmacia: 'Asignado',
  en_farmacia: 'En farmacia',
  medicamentos_recogidos: 'Preparado',
  en_camino_entrega: 'En camino',
  en_sitio: 'En camino',
  entregado: 'Entregado',
  cancelada: 'Cancelado',
};

export function etiquetaDeEstado(estado: string): EtiquetaEstadoPedido | null {
  return ETIQUETA_POR_ESTADO[estado] ?? null;
}

export type BorradorNotificacion = {
  titulo: string;
  mensaje: string;
};

const MENSAJE_POR_ESTADO: Record<
  string,
  BorradorNotificacion
> = {
  pendiente_revision: {
    titulo: 'Pedido recibido',
    mensaje: 'Recibimos tu pedido.',
  },
  en_asignacion: {
    titulo: 'Pedido validado',
    mensaje: 'Tu pedido fue validado y está listo para ser asignado.',
  },
  asignado_en_camino_farmacia: {
    titulo: 'Pedido aceptado',
    mensaje: 'Un domiciliario aceptó tu pedido y realizará la entrega.',
  },
  en_farmacia: {
    titulo: 'Pedido en proceso',
    mensaje: 'Tu pedido está siendo preparado para continuar con la entrega.',
  },
  medicamentos_recogidos: {
    titulo: 'Pedido en proceso',
    mensaje: 'Tu pedido continúa en camino hacia la entrega.',
  },
  en_camino_entrega: {
    titulo: 'Pedido en camino',
    mensaje: 'Tu pedido está en camino.',
  },
  en_sitio: {
    titulo: 'Pedido en camino',
    mensaje: 'Tu pedido está en camino.',
  },
  entregado: {
    titulo: 'Pedido entregado',
    mensaje: 'Tu pedido fue entregado correctamente.',
  },
  cancelada: {
    titulo: 'Pedido cancelado',
    mensaje: 'Tu pedido fue cancelado.',
  },
};

export function contenidoCambioEstado(
  estado: string,
): BorradorNotificacion {
  const borrador = MENSAJE_POR_ESTADO[estado];
  if (!borrador) {
    throw new Error('La notificación incluye información que no se puede enviar.');
  }
  return sellar(borrador);
}

export function contenidoAsignacion(): BorradorNotificacion {
  return sellar({
    titulo: 'Nuevo pedido asignado',
    mensaje: 'Tienes un nuevo pedido disponible para gestionar.',
  });
}

export function contenidoCuentaAprobada(): BorradorNotificacion {
  return sellar({
    titulo: 'Cuenta aprobada',
    mensaje: 'Tu cuenta fue aprobada. Ya puedes comenzar a recibir pedidos.',
  });
}

export function contenidoCuentaRechazada(): BorradorNotificacion {
  return sellar({
    titulo: 'Cuenta rechazada',
    mensaje: 'Tu solicitud de registro no fue aprobada.',
  });
}

export function sellar(borrador: BorradorNotificacion): BorradorNotificacion {
  const titulo = recortar(borrador.titulo, TITULO_MAX);
  const mensaje = recortar(borrador.mensaje, MENSAJE_MAX);
  const texto = `${titulo} ${mensaje}`.toLowerCase();
  for (const palabra of PROHIBIDOS) {
    if (texto.includes(palabra)) {
      throw new Error('La notificación incluye información que no se puede enviar.');
    }
  }
  if (/\d{6,}/.test(mensaje)) {
    throw new Error('La notificación incluye un dato numérico sensible.');
  }
  return { titulo, mensaje };
}

function recortar(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).trimEnd()}…`;
}
