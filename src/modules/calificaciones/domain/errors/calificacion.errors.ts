export class CalificacionNoAutorizadaError extends Error {
  constructor() {
    super('No autorizado.');
    this.name = 'CalificacionNoAutorizadaError';
  }
}

/** G05 — el pedido no existe. */
export class PedidoCalificacionNoEncontradoError extends Error {
  constructor() {
    super('No se encontró el pedido.');
    this.name = 'PedidoCalificacionNoEncontradoError';
  }
}

/** G05 — el pedido pertenece a otro paciente. */
export class PedidoAjenoError extends Error {
  constructor() {
    super(
      'No puedes calificar este pedido. No tienes permiso para realizar esta acción.',
    );
    this.name = 'PedidoAjenoError';
  }
}

/** G01/G05 — solo se califica un pedido entregado. */
export class PedidoNoEntregadoError extends Error {
  constructor() {
    super(
      'Aún no puedes calificar este pedido. Solo puedes calificar cuando el pedido haya sido entregado.',
    );
    this.name = 'PedidoNoEntregadoError';
  }
}

/** G01 — ya hay una calificación activa para ese pedido. */
export class CalificacionActivaExistenteError extends Error {
  constructor() {
    super('Este pedido ya tiene una calificación activa.');
    this.name = 'CalificacionActivaExistenteError';
  }
}

/** G02/G03/G04 — no hay calificación activa del dueño. */
export class CalificacionNoEncontradaError extends Error {
  constructor() {
    super('No hay una calificación activa para este pedido.');
    this.name = 'CalificacionNoEncontradaError';
  }
}

export class CalificacionInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'CalificacionInvalidaError';
  }
}
