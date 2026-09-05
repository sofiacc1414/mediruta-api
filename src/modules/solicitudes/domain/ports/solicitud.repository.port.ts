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

/** Panel admin — fila de "ver y filtrar pedidos". Solo pedidos reales
 * (con `codigoPedido`) — las solicitudes en Borrador nunca aparecen
 * acá, no son un "pedido" todavía desde la perspectiva del admin. */
export type PedidoAdmin = {
  id: string;
  codigoPedido: string;
  estado: EstadoSolicitud;
  pacienteNombre: string | null;
  pacienteCorreo: string;
  domiciliarioNombre: string | null;
  domiciliarioCorreo: string | null;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
  enviadoEn: string | null;
  /** Desde cuándo está en `en_asignacion` (`null` si nunca pasó por
   * ahí, o si ya tiene domiciliario) — con esto el panel admin calcula
   * "está demorado" contra el umbral configurable, sin hornear el
   * número acá. */
  enAsignacionDesde: string | null;
};

export type FiltrosPedidosAdmin = {
  estado?: EstadoSolicitud;
  desde?: string;
  hasta?: string;
  busqueda?: string;
  pacienteBusqueda?: string;
  domiciliarioBusqueda?: string;
};

/** Panel admin — detalle completo de UN pedido (no solo la fila del
 * listado): igual que `SolicitudDetalle` que ve el Paciente, pero sin
 * restricción de dueño (solo exige rol admin) y con los datos de
 * contacto de paciente/domiciliario, que el admin sí necesita ver. */
export type PedidoAdminDetalle = {
  id: string;
  codigoPedido: string;
  estado: EstadoSolicitud;
  recetaPath: string | null;
  recetaFechaVencimiento: string | null;
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  creadoEn: string;
  enviadoEn: string | null;
  canceladoEn: string | null;
  codigoEntrega: string | null;
  pacienteNombre: string | null;
  pacienteCorreo: string;
  pacienteTelefono: string | null;
  pacienteCedulaFrentePath: string | null;
  pacienteCedulaReversoPath: string | null;
  domiciliarioNombre: string | null;
  domiciliarioCorreo: string | null;
  domiciliarioTelefono: string | null;
  enAsignacionDesde: string | null;
};

/** Panel admin — fila de "domiciliarios cercanos a la farmacia de este
 * pedido", para la asignación manual de un pedido demorado. */
export type DomiciliarioCercanoAdmin = {
  usuarioId: string;
  nombreCompleto: string | null;
  telefono: string | null;
  distanciaMetros: number;
};

export type ResultadoAsignarDomiciliarioAdmin =
  | 'asignado'
  | 'ya_asignado'
  | 'no_encontrado'
  | 'no_autorizado'
  | 'domiciliario_no_disponible';

export type ConfiguracionAdmin = {
  umbralDemoraAsignacionMinutos: number;
};

export type ResultadoActualizarConfiguracionAdmin =
  'actualizado' | 'invalido' | 'no_autorizado';

/** HU-07 — un incidente reportado por el Domiciliario sobre un pedido
 * en curso, visible para el Administrador hasta que lo resuelva. No
 * reemplaza el `estado` real del pedido (ver ports comment en la
 * migración) — es información aparte. */
/** Quién reportó la novedad — hasta esta ronda solo el Domiciliario
 * podía; ahora el Paciente también (ver `reportarNovedadPaciente`). */
export type OrigenNovedad = 'domiciliario' | 'paciente';

/** HU-07 (ronda 3) — clasifica qué es la novedad: 'pregunta' es el
 * mensaje directo de siempre; 'edicion' trae `datosActuales`/
 * `datosPropuestos` para que el admin vea el diff antes de aprobar;
 * 'codigo' es "no vi mi código de entrega", sin datos propuestos — el
 * admin actúa directo sobre el pedido (regenerar/reenviar). */
export type TipoNovedad = 'pregunta' | 'edicion' | 'codigo';

/** Campos editables vía solicitud de edición (ronda 4: direcciones,
 * medicamentos y foto de receta — antes solo direcciones). `null`/
 * `undefined` en un campo significa "el paciente no pidió cambiar ese
 * campo". `recetaPath` es el path interno en Storage, nunca se expone
 * tal cual al cliente — la capa de aplicación lo convierte en URL
 * firmada (ver `ListarNovedadesAbiertasUseCase`). */
export type DatosEdicionPedido = {
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  medicamentos?: Medicamento[];
  recetaPath?: string;
};

export type NovedadAbierta = {
  id: string;
  solicitudId: string;
  codigoPedido: string | null;
  detalle: string;
  reportadaPorCorreo: string;
  origen: OrigenNovedad;
  tipo: TipoNovedad;
  datosActuales: DatosEdicionPedido | null;
  datosPropuestos: DatosEdicionPedido | null;
  /** Código de entrega vigente del pedido — el panel lo muestra cuando
   * `tipo = 'codigo'`, junto a las acciones de regenerar/reenviar. */
  codigoEntrega: string | null;
  /** Path interno en Storage de la receta vigente del pedido (bucket
   * privado, inútil sin firmar) — poblado por el repositorio, la capa
   * de aplicación lo consume para generar `recetaActualUrl` y lo
   * descarta antes de responder al cliente (ver
   * `ListarNovedadesAbiertasUseCase`). */
  recetaPathActual?: string | null;
  /** URLs firmadas de la receta vigente del pedido y de la propuesta en
   * `datosPropuestos.recetaPath`, si la hay — solo se completan cuando
   * `tipo === 'edicion'` (ver `ListarNovedadesAbiertasUseCase`). */
  recetaActualUrl?: string | null;
  recetaPropuestaUrl?: string | null;
  creadoEn: string;
};

export type NovedadDelPaciente = {
  id: string;
  detalle: string;
  creadoEn: string;
};

/** HU-07 (ronda 5) — a diferencia de `NovedadDelPaciente`/
 * `obtenerNovedadAbierta` (solo la última, sin resolver), esto trae
 * TODAS las novedades de una solicitud, resueltas o no — para que el
 * paciente pueda ver el resultado de las que ya se atendieron y
 * reportar varias a la vez no le "tape" las anteriores. */
export type NovedadDelPacienteConEstado = {
  id: string;
  tipo: TipoNovedad;
  detalle: string;
  origen: OrigenNovedad;
  creadoEn: string;
  resuelta: boolean;
  accionEdicion: 'aprobada' | 'rechazada' | null;
  datosPropuestos: DatosEdicionPedido | null;
};

/** Igual que `NovedadDelPaciente` pero con `origen`/`tipo` — solo la usa
 * el detalle de pedido del panel admin (ver `obtenerNovedadAbiertaPedidoAdmin`). */
export type NovedadAbiertaPedidoAdmin = NovedadDelPaciente & {
  origen: OrigenNovedad;
  tipo: TipoNovedad;
  datosActuales: DatosEdicionPedido | null;
  datosPropuestos: DatosEdicionPedido | null;
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
  'aceptado' | 'ya_asignado' | 'ya_tiene_pedido_activo' | 'no_encontrado';

/** HU-07 — resultado común de las transiciones manuales del
 * Domiciliario (recogido, iniciar entrega, en sitio). */
export type ResultadoTransicionPedido = 'actualizado' | 'no_encontrado';

export type ResultadoEntregarPedido =
  'entregado' | 'codigo_incorrecto' | 'no_encontrado';

export type ResultadoReportarNovedad =
  { resultado: 'reportada'; id: string } | { resultado: 'no_encontrado' };

export type ResultadoResolverNovedad = 'resuelta' | 'no_encontrado';

/** HU-07 (ronda 3) — aprobar/rechazar una novedad de tipo 'edicion'.
 * `no_autorizado` es defensa en profundidad (el `RolesGuard` del
 * controller ya exige ADMINISTRADOR/ROOT) — mismo criterio laxo que
 * `ResolverNovedadUseCase` ya usaba, no se distingue en el use case. */
export type ResultadoAccionEdicionPedido =
  'aprobada' | 'rechazada' | 'no_encontrado' | 'no_autorizado';

export type ResultadoRegenerarCodigoEntrega = {
  resultado: 'regenerado' | 'no_encontrado' | 'no_autorizado';
  codigoEntrega: string | null;
};

export type CodigoEntregaParaCorreo = {
  resultado: 'ok' | 'no_encontrado' | 'no_autorizado';
  codigoEntrega: string | null;
  codigoPedido: string | null;
  pacienteCorreo: string | null;
  pacienteNombre: string | null;
};

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

  /** HU-07 (ronda 5) — todas las novedades de la solicitud, resueltas
   * o no, más nuevas primero. Complementa a `obtenerNovedadAbierta`,
   * no la reemplaza. */
  abstract listarNovedadesSolicitud(
    pacienteId: string,
    solicitudId: string,
  ): Promise<NovedadDelPacienteConEstado[]>;

  /** El Paciente reporta una novedad sobre su propio pedido — mismo
   * criterio que `reportarNovedad` (Domiciliario), pero guardado contra
   * `paciente_id` y con `origen = 'paciente'`. */
  abstract reportarNovedadPaciente(
    pacienteId: string,
    solicitudId: string,
    detalle: string,
  ): Promise<ResultadoReportarNovedad>;

  /** HU-07 (ronda 3/4) — el Paciente pide corregir dirección de
   * entrega, de farmacia y/o medicamentos de un pedido ya enviado (no
   * Borrador — eso se edita directo con `actualizar()`). Crea una
   * novedad tipo 'edicion' con `datosActuales`/`datosPropuestos`,
   * pendiente de que el admin apruebe o rechace — no cambia la
   * solicitud todavía. Si además propone una foto de receta nueva, esa
   * va aparte vía `adjuntarRecetaPropuestaEdicion` (multipart, después
   * de creada la novedad) — por eso `incluyeReceta` existe: sin él,
   * pedir *solo* cambiar la foto fallaría la validación de "algún
   * cambio propuesto". */
  abstract solicitarEdicionPedido(
    pacienteId: string,
    solicitudId: string,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
    detalle: string | null,
    medicamentos: Medicamento[] | null,
    incluyeReceta: boolean,
  ): Promise<ResultadoReportarNovedad>;

  /** HU-07 (ronda 4) — adjunta una foto de receta "propuesta" a una
   * novedad de edición ya creada. No toca la receta vigente del
   * pedido — eso solo pasa si el admin aprueba. `false` si la novedad
   * no existe, no es del paciente, no es tipo 'edicion' o ya se
   * resolvió. */
  abstract adjuntarRecetaPropuestaEdicion(
    pacienteId: string,
    novedadId: string,
    recetaPath: string,
  ): Promise<boolean>;

  /** HU-07 (ronda 3) — el Paciente reporta que el código de entrega no
   * se generó o no lo ve en su pantalla. Sin datos propuestos — el
   * admin actúa directo sobre el pedido (regenerar/reenviar). */
  abstract reportarCodigoNoGenerado(
    pacienteId: string,
    solicitudId: string,
    detalle: string | null,
  ): Promise<ResultadoReportarNovedad>;

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

  // --- Administrador (pedidos/novedades) ---

  /** Panel admin — "ver y filtrar pedidos", más recientes primero,
   * tope de 200 filas (sin paginación todavía). */
  abstract listarPedidosAdmin(
    adminId: string,
    filtros: FiltrosPedidosAdmin,
  ): Promise<PedidoAdmin[]>;

  /** Panel admin — detalle completo de un pedido puntual (no solo la
   * fila del listado). `null` si no existe o no es un pedido real
   * (`codigoPedido` nulo, ej. sigue en Borrador). */
  abstract obtenerPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<PedidoAdminDetalle | null>;

  abstract listarMedicamentosPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<Medicamento[]>;

  abstract listarHistorialPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]>;

  abstract obtenerNovedadAbiertaPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<NovedadAbiertaPedidoAdmin | null>;

  abstract listarNovedadesAbiertas(adminId: string): Promise<NovedadAbierta[]>;

  abstract resolverNovedad(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoResolverNovedad>;

  /** HU-07 (ronda 3) — aplica `datosPropuestos` (solo los campos no
   * nulos) a la solicitud y cierra la novedad como aprobada. */
  abstract aprobarEdicionPedidoAdmin(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoAccionEdicionPedido>;

  /** HU-07 (ronda 3) — cierra la novedad como rechazada, sin tocar el
   * pedido. */
  abstract rechazarEdicionPedidoAdmin(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoAccionEdicionPedido>;

  /** HU-07 (ronda 3) — genera un `codigoEntrega` nuevo para el pedido
   * (mismo algoritmo que `enviar()`). No aplica sobre `entregado`/
   * `cancelada` ni sobre pedidos sin `codigoPedido` (Borrador). */
  abstract regenerarCodigoEntregaAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<ResultadoRegenerarCodigoEntrega>;

  /** HU-07 (ronda 3) — datos para que la API reenvíe el código de
   * entrega vigente por correo al paciente (el envío en sí lo hace un
   * caso de uso aparte vía `CorreoCodigoEntregaPort`). */
  abstract obtenerCodigoEntregaParaCorreoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<CodigoEntregaParaCorreo>;

  /** Panel admin — "pedido demorado sin domiciliario": candidatos
   * disponibles más cercanos a la farmacia de ese pedido, tope 20. */
  abstract listarDomiciliariosCercanosAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<DomiciliarioCercanoAdmin[]>;

  /** Asignación manual — misma transición que `aceptarPedido` (el
   * Domiciliario aceptando su propio pedido), pero elegida por el admin. */
  abstract asignarDomiciliarioAdmin(
    adminId: string,
    solicitudId: string,
    domiciliarioId: string,
  ): Promise<ResultadoAsignarDomiciliarioAdmin>;

  /** Umbral de "pedido demorado" — configurable, no fijo en código. */
  abstract obtenerConfiguracionAdmin(
    adminId: string,
  ): Promise<ConfiguracionAdmin | null>;

  abstract actualizarConfiguracionAdmin(
    adminId: string,
    umbralMinutos: number,
  ): Promise<ResultadoActualizarConfiguracionAdmin>;
}
