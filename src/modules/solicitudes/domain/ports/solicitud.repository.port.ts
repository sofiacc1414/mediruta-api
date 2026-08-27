export type EstadoSolicitud =
  | 'borrador'
  | 'pendiente_revision'
  | 'en_asignacion'
  | 'asignado_en_camino_farmacia'
  | 'medicamentos_recogidos'
  | 'en_camino_entrega'
  | 'en_sitio'
  | 'entregado'
  | 'cancelada';

export type Medicamento = {
  nombre: string | null;
  concentracion: string | null;
  formaFarmaceutica: string | null;
  cantidad: string | null;
  posologia: string | null;
};

export type DatosSolicitud = {
  medicamentos: Medicamento[];
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
  /** Dónde el domiciliario retira el medicamento — distinta de
   * `direccionEntrega` (dónde se lo lleva al paciente). */
  direccionFarmacia: string | null;
};

export type SolicitudResumen = {
  id: string;
  /** Solo existe una vez enviada (G05) — nulo mientras está en
   * Borrador, todavía no es un "pedido". */
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  creadoEn: string;
};

export type SolicitudDetalle = {
  id: string;
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  recetaPath: string | null;
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
  enviadoEn: string | null;
  canceladoEn: string | null;
  /** Referencia viva a `perfil_paciente.foto_cedula_frente_path`/
   * `foto_cedula_reverso_path` (HU-02) — nunca se copia a la solicitud. */
  cedulaFrentePath: string | null;
  cedulaReversoPath: string | null;
  /** Solo existe una vez enviada (G05), igual que codigoPedido — el
   * paciente lo ve en el detalle de su pedido para dárselo al
   * domiciliario al recibirlo. */
  codigoEntrega: string | null;
};

/** HU-09 — un pedido en `en_asignacion`, visto por un Domiciliario,
 * ordenado por distancia real a la farmacia. */
export type PedidoDisponible = {
  id: string;
  codigoPedido: string | null;
  direccionFarmacia: string | null;
  direccionEntrega: string | null;
  distanciaMetros: number;
  creadoEn: string;
};

/** Una fila del historial de pedidos que el Domiciliario ya atendió
 * (aceptó en algún momento) — incluye entregados, cancelados y el
 * activo actual si tiene uno; el filtro Activas/Historial lo hace la
 * UI, no la API (mismo criterio que `SolicitudResumen` del lado
 * Paciente). */
export type PedidoHistorialDomiciliario = {
  id: string;
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  direccionEntrega: string | null;
  creadoEn: string;
};

/** HU-09/HU-07 — el pedido que el Domiciliario tiene en curso ahora
 * mismo (uno de los 4 estados "activos"). A propósito NO incluye
 * `codigoEntrega` — el paciente se lo dicta recién al momento de la
 * entrega, el Domiciliario no debe conocerlo de antemano. */
export type PedidoActivoDomiciliario = {
  id: string;
  codigoPedido: string | null;
  estado: EstadoSolicitud;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
};

/** HU-07/HU-09 — ver comentario de `obtenerDocumentosPacienteParaRecoger`. */
export type DocumentosPacienteParaRecoger = {
  cedulaFrentePath: string | null;
  cedulaReversoPath: string | null;
};

/** HU-07 — un incidente reportado por el Domiciliario sobre un pedido
 * en curso, visible para el Administrador hasta que lo resuelva. No
 * reemplaza el `estado` real del pedido (ver ports comment en la
 * migración) — es información aparte. */
export type NovedadAbierta = {
  id: string;
  solicitudId: string;
  codigoPedido: string | null;
  detalle: string;
  reportadaPorCorreo: string;
  creadoEn: string;
};

export type NovedadDelPaciente = {
  id: string;
  detalle: string;
  creadoEn: string;
};

export type EventoHistorial = {
  estado: EstadoSolicitud;
  creadoEn: string;
};

export type ResultadoCrear =
  | { resultado: 'creada'; id: string }
  | { resultado: 'no_autorizado' }
  | { resultado: 'sin_cedula' };

export type ResultadoEnviar =
  | { resultado: 'enviada'; codigoPedido: string }
  | { resultado: 'incompleta'; faltantes: string[] }
  | { resultado: 'no_encontrada' };

export type ResultadoCancelar = 'cancelada' | 'no_encontrada';

/** HU-09 — resultado de intentar aceptar un pedido del pool.
 * `ya_asignado` es el caso normal de dos Domiciliarios aceptando a la
 * vez, no un error — el guard atómico de `app.aceptar_pedido` decide
 * quién gana. */
export type ResultadoAceptarPedido =
  | 'aceptado'
  | 'ya_asignado'
  | 'ya_tiene_pedido_activo'
  | 'no_encontrado';

/** HU-07 — resultado común de las transiciones manuales del
 * Domiciliario (recogido, iniciar entrega, en sitio). */
export type ResultadoTransicionPedido = 'actualizado' | 'no_encontrado';

export type ResultadoEntregarPedido =
  | 'entregado'
  | 'codigo_incorrecto'
  | 'no_encontrado';

export type ResultadoReportarNovedad =
  | { resultado: 'reportada'; id: string }
  | { resultado: 'no_encontrado' };

export type ResultadoResolverNovedad = 'resuelta' | 'no_encontrado';

/** G01-G06 de HU-03 — el Paciente crea y gestiona sus propias
 * solicitudes. Todas las operaciones están acotadas al dueño (nunca se
 * expone la de otro paciente) — ver comentarios de las funciones app.*
 * en la migración. */
export abstract class SolicitudRepositoryPort {
  /** G01. `sin_cedula` si el perfil del paciente no tiene foto de
   * cédula cargada todavía (HU-02) — no se puede crear sin eso. */
  abstract crear(
    pacienteId: string,
    medicamentos: Medicamento[],
    recetaPath: string | null,
    recetaFechaVencimiento: string | null,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
  ): Promise<ResultadoCrear>;

  /** G02. */
  abstract listar(pacienteId: string): Promise<SolicitudResumen[]>;

  /** G03. `null` si no existe o no es del dueño. */
  abstract obtener(
    pacienteId: string,
    solicitudId: string,
  ): Promise<SolicitudDetalle | null>;

  /** G03 — medicamentos de la solicitud, en el orden en que se cargaron. */
  abstract listarMedicamentos(
    pacienteId: string,
    solicitudId: string,
  ): Promise<Medicamento[]>;

  /** G03 — historial de estados, más antiguo primero. */
  abstract listarHistorial(
    pacienteId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]>;

  /** G04 — solo si está en Borrador y es del dueño. Reemplaza todos los
   * medicamentos por los recibidos. */
  abstract actualizar(
    pacienteId: string,
    solicitudId: string,
    medicamentos: Medicamento[],
    recetaFechaVencimiento: string | null,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
  ): Promise<boolean>;

  /** Sube/reemplaza la foto de la receta (ya subida a Storage). */
  abstract actualizarReceta(
    pacienteId: string,
    solicitudId: string,
    path: string,
  ): Promise<boolean>;

  /** Lo que hace falta ANTES de geocodificar la farmacia (HU-09): la
   * dirección recién tipeada + ciudad/departamento del perfil del
   * paciente. `null` si la solicitud no existe o no es del dueño. */
  abstract obtenerDatosGeocodificacionFarmacia(
    pacienteId: string,
    solicitudId: string,
  ): Promise<{
    direccionFarmacia: string | null;
    ciudad: string | null;
    departamento: string | null;
  } | null>;

  /** G05. `farmaciaLat`/`farmaciaLng` ya vienen geocodificados (el caso
   * de uso llama a GeocodificacionPort antes) — si la geocodificación
   * falló, se mandan `null` y el pedido se envía igual, sin ubicación
   * de farmacia (HU-09, no bloquea el envío). */
  abstract enviar(
    pacienteId: string,
    solicitudId: string,
    farmaciaLat: number | null,
    farmaciaLng: number | null,
  ): Promise<ResultadoEnviar>;

  /** G06. */
  abstract cancelar(
    pacienteId: string,
    solicitudId: string,
  ): Promise<ResultadoCancelar>;

  /** HU-09 — si el paciente tiene una novedad abierta sobre este
   * pedido, para mostrarla en el detalle. `null` si no hay ninguna
   * (o el pedido no existe/no es del dueño). */
  abstract obtenerNovedadAbierta(
    pacienteId: string,
    solicitudId: string,
  ): Promise<NovedadDelPaciente | null>;

  // --- Domiciliario (HU-09/HU-07) ---

  /** Pedidos en `en_asignacion`, ordenados por distancia real a la
   * farmacia — vacío si el Domiciliario no está disponible o no tiene
   * ubicación guardada todavía. */
  abstract listarPedidosDisponibles(
    domiciliarioId: string,
  ): Promise<PedidoDisponible[]>;

  /** Todos los pedidos que el Domiciliario aceptó alguna vez (en curso,
   * entregados o cancelados), más reciente primero — "Mis pedidos"
   * del lado Domiciliario. */
  abstract listarHistorialPedidos(
    domiciliarioId: string,
  ): Promise<PedidoHistorialDomiciliario[]>;

  /** Guard atómico — dos Domiciliarios aceptando el mismo pedido a la
   * vez, solo uno gana. */
  abstract aceptarPedido(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoAceptarPedido>;

  abstract marcarMedicamentosRecogidos(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoTransicionPedido>;

  abstract iniciarEntrega(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoTransicionPedido>;

  abstract marcarEnSitio(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoTransicionPedido>;

  /** Valida el código de 6 contra el guardado — case-insensitive. */
  abstract entregarPedido(
    domiciliarioId: string,
    solicitudId: string,
    codigo: string,
  ): Promise<ResultadoEntregarPedido>;

  /** No cambia `estado` — la novedad convive con el paso real en el
   * que esté el pedido (ver comentario en la migración). */
  abstract reportarNovedad(
    domiciliarioId: string,
    solicitudId: string,
    detalle: string,
  ): Promise<ResultadoReportarNovedad>;

  /** El pedido que el Domiciliario tiene en curso ahora mismo, o `null`
   * si no tiene ninguno — sin esto no había forma de recuperar "su"
   * pedido tras cerrar y reabrir la app (`listarPedidosDisponibles` deja
   * de incluirlo apenas lo acepta). */
  abstract obtenerPedidoActivo(
    domiciliarioId: string,
  ): Promise<PedidoActivoDomiciliario | null>;

  /** Historial del pedido activo del Domiciliario — mismo criterio de
   * "dueño" que `listarHistorial`, acotado por `domiciliario_id` en vez
   * de `paciente_id`. */
  abstract listarHistorialPedidoActivo(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]>;

  /** Si el propio Domiciliario ya reportó una novedad sobre este pedido
   * y sigue sin resolver — para no ofrecerle "Reportar novedad" de
   * nuevo. */
  abstract obtenerNovedadPropiaAbierta(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<NovedadDelPaciente | null>;

  /** HU-07/HU-09 — la cédula del Paciente (ambos lados), para que el
   * Domiciliario la muestre en la farmacia al retirar el medicamento a
   * su nombre. `null` si el pedido no es del Domiciliario o no está en
   * `asignado_en_camino_farmacia` — por seguridad/privacidad solo se
   * expone en esa ventana puntual, ni antes ni después. */
  abstract obtenerDocumentosPacienteParaRecoger(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<DocumentosPacienteParaRecoger | null>;

  // --- Administrador (novedades) ---

  abstract listarNovedadesAbiertas(adminId: string): Promise<NovedadAbierta[]>;

  abstract resolverNovedad(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoResolverNovedad>;
}
