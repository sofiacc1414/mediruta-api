import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  CodigoEntregaParaCorreo,
  ConfiguracionAdmin,
  DatosEdicionPedido,
  DocumentosPacienteParaRecoger,
  DomiciliarioCercanoAdmin,
  EstadoSolicitud,
  EventoHistorial,
  FiltrosPedidosAdmin,
  Medicamento,
  NovedadAbierta,
  NovedadAbiertaPedidoAdmin,
  NovedadDelPaciente,
  NovedadDelPacienteConEstado,
  OrigenNovedad,
  PedidoActivoDomiciliario,
  PedidoAdmin,
  PedidoAdminDetalle,
  PedidoDisponible,
  PedidoHistorialDomiciliario,
  ResultadoAccionEdicionPedido,
  ResultadoAceptarPedido,
  ResultadoActualizarConfiguracionAdmin,
  ResultadoAsignarDomiciliarioAdmin,
  ResultadoCancelar,
  ResultadoCrear,
  ResultadoEnviar,
  ResultadoEntregarPedido,
  ResultadoRegenerarCodigoEntrega,
  ResultadoReportarNovedad,
  ResultadoResolverNovedad,
  ResultadoTransicionPedido,
  SolicitudDetalle,
  SolicitudRepositoryPort,
  SolicitudResumen,
  TipoNovedad,
} from '../../domain/ports/solicitud.repository.port';

type FilaResumen = {
  id: string;
  codigo_pedido: string | null;
  estado: EstadoSolicitud;
  creado_en: string;
};

type FilaDetalle = {
  id: string;
  codigo_pedido: string | null;
  estado: EstadoSolicitud;
  receta_path: string | null;
  receta_fecha_vencimiento: string | null;
  direccion_entrega: string | null;
  direccion_farmacia: string | null;
  creado_en: string;
  enviado_en: string | null;
  cancelado_en: string | null;
  cedula_frente_path: string | null;
  cedula_reverso_path: string | null;
  codigo_entrega: string | null;
};

type FilaDatosGeocodificacionFarmacia = {
  direccion_farmacia: string | null;
  ciudad: string | null;
  departamento: string | null;
};

type FilaPedidoDisponible = {
  id: string;
  codigo_pedido: string | null;
  direccion_farmacia: string | null;
  direccion_entrega: string | null;
  distancia_metros: number;
  creado_en: string;
};

type FilaPedidoHistorialDomiciliario = {
  id: string;
  codigo_pedido: string | null;
  estado: EstadoSolicitud;
  direccion_entrega: string | null;
  creado_en: string;
};

type FilaPedidoActivoDomiciliario = {
  id: string;
  codigo_pedido: string | null;
  estado: EstadoSolicitud;
  direccion_entrega: string | null;
  direccion_farmacia: string | null;
  creado_en: string;
};

type FilaDocumentosPacienteParaRecoger = {
  cedula_frente_path: string | null;
  cedula_reverso_path: string | null;
};

type FilaPedidoAdmin = {
  id: string;
  codigo_pedido: string;
  estado: EstadoSolicitud;
  paciente_nombre: string | null;
  paciente_correo: string;
  domiciliario_nombre: string | null;
  domiciliario_correo: string | null;
  direccion_entrega: string | null;
  direccion_farmacia: string | null;
  creado_en: string;
  enviado_en: string | null;
  en_asignacion_desde: string | null;
};

type FilaPedidoAdminDetalle = {
  id: string;
  codigo_pedido: string;
  estado: EstadoSolicitud;
  receta_path: string | null;
  receta_fecha_vencimiento: string | null;
  direccion_entrega: string | null;
  direccion_farmacia: string | null;
  creado_en: string;
  enviado_en: string | null;
  cancelado_en: string | null;
  codigo_entrega: string | null;
  paciente_nombre: string | null;
  paciente_correo: string;
  paciente_telefono: string | null;
  paciente_cedula_frente_path: string | null;
  paciente_cedula_reverso_path: string | null;
  domiciliario_nombre: string | null;
  domiciliario_correo: string | null;
  domiciliario_telefono: string | null;
  en_asignacion_desde: string | null;
};

type FilaDomiciliarioCercanoAdmin = {
  usuario_id: string;
  nombre_completo: string | null;
  telefono: string | null;
  distancia_metros: number;
};

type FilaConfiguracionAdmin = {
  umbral_demora_asignacion_minutos: number;
};

type FilaDatosEdicionPedido = {
  direccionEntrega: string | null;
  direccionFarmacia: string | null;
  medicamentos?: Medicamento[];
  recetaPath?: string;
};

type FilaNovedadAbierta = {
  id: string;
  solicitud_id: string;
  codigo_pedido: string | null;
  detalle: string;
  reportada_por_correo: string;
  origen: OrigenNovedad;
  tipo: TipoNovedad;
  datos_actuales: FilaDatosEdicionPedido | null;
  datos_propuestos: FilaDatosEdicionPedido | null;
  codigo_entrega: string | null;
  receta_path: string | null;
  creado_en: string;
};

type FilaNovedadDelPaciente = {
  id: string;
  detalle: string;
  creado_en: string;
};

type FilaNovedadDelPacienteConEstado = {
  id: string;
  tipo: TipoNovedad;
  detalle: string;
  origen: OrigenNovedad;
  creado_en: string;
  resuelta_en: string | null;
  accion_edicion: 'aprobada' | 'rechazada' | null;
  datos_propuestos: FilaDatosEdicionPedido | null;
};

type FilaNovedadAbiertaPedidoAdmin = FilaNovedadDelPaciente & {
  origen: OrigenNovedad;
  tipo: TipoNovedad;
  datos_actuales: FilaDatosEdicionPedido | null;
  datos_propuestos: FilaDatosEdicionPedido | null;
};

function datosEdicionDesde(
  fila: FilaDatosEdicionPedido | null,
): DatosEdicionPedido | null {
  if (!fila) return null;
  return {
    direccionEntrega: fila.direccionEntrega,
    direccionFarmacia: fila.direccionFarmacia,
    medicamentos: fila.medicamentos,
    recetaPath: fila.recetaPath,
  };
}

type FilaMedicamento = {
  nombre: string | null;
  concentracion: string | null;
  forma_farmaceutica: string | null;
  cantidad: string | null;
  posologia: string | null;
};

type FilaHistorial = { estado: EstadoSolicitud; creado_en: string };

type FilaCrear = { resultado: string; id: string | null };

type FilaEnviar = {
  resultado: string;
  faltantes: string[] | null;
  codigo_pedido: string | null;
};

/** Todo acotado al paciente dueño (nunca a otra cuenta) — pacienteId
 * siempre es identidad.usuarioId del JWT, no algo que mande el cliente.
 *
 * Los medicamentos viajan como jsonb: `pg` no serializa objetos/arrays
 * JS automáticamente en los parámetros, así que se hace
 * `JSON.stringify` acá antes de mandarlos — la función app.* los
 * castea con `::jsonb` y los descompone con `jsonb_to_recordset`. */
@Injectable()
export class PostgresSolicitudRepository extends SolicitudRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  crear(
    pacienteId: string,
    medicamentos: Medicamento[],
    recetaPath: string | null,
    recetaFechaVencimiento: string | null,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
  ): Promise<ResultadoCrear> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaCrear>(
        `select * from app.crear_solicitud($1, $2::jsonb, $3, $4, $5, $6)`,
        [
          pacienteId,
          JSON.stringify(medicamentos),
          recetaPath,
          recetaFechaVencimiento,
          direccionEntrega,
          direccionFarmacia,
        ],
      );
      const fila = result.rows[0];

      if (fila.resultado === 'creada' && fila.id) {
        return { resultado: 'creada', id: fila.id };
      }
      if (
        fila.resultado === 'no_autorizado' ||
        fila.resultado === 'sin_cedula'
      ) {
        return { resultado: fila.resultado };
      }
      throw new Error(
        `Resultado inesperado de app.crear_solicitud: ${fila.resultado}`,
      );
    });
  }

  listar(pacienteId: string): Promise<SolicitudResumen[]> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaResumen>(
        'select * from app.listar_solicitudes($1)',
        [pacienteId],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        creadoEn: fila.creado_en,
      }));
    });
  }

  obtener(
    pacienteId: string,
    solicitudId: string,
  ): Promise<SolicitudDetalle | null> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaDetalle>(
        'select * from app.obtener_solicitud($1, $2)',
        [pacienteId, solicitudId],
      );

      if (!result.rowCount) {
        return null;
      }

      const fila = result.rows[0];
      return {
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        recetaPath: fila.receta_path,
        recetaFechaVencimiento: fila.receta_fecha_vencimiento,
        direccionEntrega: fila.direccion_entrega,
        direccionFarmacia: fila.direccion_farmacia,
        creadoEn: fila.creado_en,
        enviadoEn: fila.enviado_en,
        canceladoEn: fila.cancelado_en,
        cedulaFrentePath: fila.cedula_frente_path,
        cedulaReversoPath: fila.cedula_reverso_path,
        codigoEntrega: fila.codigo_entrega,
      };
    });
  }

  obtenerDatosGeocodificacionFarmacia(
    pacienteId: string,
    solicitudId: string,
  ): Promise<{
    direccionFarmacia: string | null;
    ciudad: string | null;
    departamento: string | null;
  } | null> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaDatosGeocodificacionFarmacia>(
        'select * from app.obtener_datos_geocodificacion_farmacia($1, $2)',
        [pacienteId, solicitudId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return {
        direccionFarmacia: fila.direccion_farmacia,
        ciudad: fila.ciudad,
        departamento: fila.departamento,
      };
    });
  }

  listarMedicamentos(
    pacienteId: string,
    solicitudId: string,
  ): Promise<Medicamento[]> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaMedicamento>(
        'select * from app.listar_medicamentos_solicitud($1, $2)',
        [pacienteId, solicitudId],
      );
      return result.rows.map((fila) => ({
        nombre: fila.nombre,
        concentracion: fila.concentracion,
        formaFarmaceutica: fila.forma_farmaceutica,
        cantidad: fila.cantidad,
        posologia: fila.posologia,
      }));
    });
  }

  listarHistorial(
    pacienteId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaHistorial>(
        'select * from app.listar_historial_solicitud($1, $2)',
        [pacienteId, solicitudId],
      );
      return result.rows.map((fila) => ({
        estado: fila.estado,
        creadoEn: fila.creado_en,
      }));
    });
  }

  actualizar(
    pacienteId: string,
    solicitudId: string,
    medicamentos: Medicamento[],
    recetaFechaVencimiento: string | null,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
  ): Promise<boolean> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{ actualizar_solicitud: boolean }>(
        `select app.actualizar_solicitud($1, $2, $3::jsonb, $4, $5, $6)
           as actualizar_solicitud`,
        [
          pacienteId,
          solicitudId,
          JSON.stringify(medicamentos),
          recetaFechaVencimiento,
          direccionEntrega,
          direccionFarmacia,
        ],
      );
      return result.rows[0].actualizar_solicitud;
    });
  }

  actualizarReceta(
    pacienteId: string,
    solicitudId: string,
    path: string,
  ): Promise<boolean> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{
        actualizar_receta_solicitud: boolean;
      }>(
        'select app.actualizar_receta_solicitud($1, $2, $3) as actualizar_receta_solicitud',
        [pacienteId, solicitudId, path],
      );
      return result.rows[0].actualizar_receta_solicitud;
    });
  }

  enviar(
    pacienteId: string,
    solicitudId: string,
    farmaciaLat: number | null,
    farmaciaLng: number | null,
  ): Promise<ResultadoEnviar> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaEnviar>(
        'select * from app.enviar_solicitud($1, $2, $3, $4)',
        [pacienteId, solicitudId, farmaciaLat, farmaciaLng],
      );
      const fila = result.rows[0];

      if (fila.resultado === 'incompleta') {
        return { resultado: 'incompleta', faltantes: fila.faltantes ?? [] };
      }
      if (fila.resultado === 'no_encontrada') {
        return { resultado: 'no_encontrada' };
      }
      if (fila.resultado === 'enviada' && fila.codigo_pedido) {
        return { resultado: 'enviada', codigoPedido: fila.codigo_pedido };
      }
      throw new Error(
        `Resultado inesperado de app.enviar_solicitud: ${fila.resultado}`,
      );
    });
  }

  cancelar(
    pacienteId: string,
    solicitudId: string,
  ): Promise<ResultadoCancelar> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{
        cancelar_solicitud: ResultadoCancelar;
      }>('select app.cancelar_solicitud($1, $2) as cancelar_solicitud', [
        pacienteId,
        solicitudId,
      ]);
      return result.rows[0].cancelar_solicitud;
    });
  }

  obtenerNovedadAbierta(
    pacienteId: string,
    solicitudId: string,
  ): Promise<NovedadDelPaciente | null> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaNovedadDelPaciente>(
        'select * from app.obtener_novedad_abierta_solicitud($1, $2)',
        [pacienteId, solicitudId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return { id: fila.id, detalle: fila.detalle, creadoEn: fila.creado_en };
    });
  }

  listarNovedadesSolicitud(
    pacienteId: string,
    solicitudId: string,
  ): Promise<NovedadDelPacienteConEstado[]> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaNovedadDelPacienteConEstado>(
        'select * from app.listar_novedades_solicitud($1, $2)',
        [pacienteId, solicitudId],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        tipo: fila.tipo,
        detalle: fila.detalle,
        origen: fila.origen,
        creadoEn: fila.creado_en,
        resuelta: fila.resuelta_en !== null,
        accionEdicion: fila.accion_edicion,
        datosPropuestos: datosEdicionDesde(fila.datos_propuestos),
      }));
    });
  }

  listarPedidosDisponibles(
    domiciliarioId: string,
  ): Promise<PedidoDisponible[]> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaPedidoDisponible>(
        'select * from app.listar_pedidos_disponibles($1)',
        [domiciliarioId],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        direccionFarmacia: fila.direccion_farmacia,
        direccionEntrega: fila.direccion_entrega,
        distanciaMetros: fila.distancia_metros,
        creadoEn: fila.creado_en,
      }));
    });
  }

  listarHistorialPedidos(
    domiciliarioId: string,
  ): Promise<PedidoHistorialDomiciliario[]> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaPedidoHistorialDomiciliario>(
        'select * from app.listar_historial_pedidos_domiciliario($1)',
        [domiciliarioId],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        direccionEntrega: fila.direccion_entrega,
        creadoEn: fila.creado_en,
      }));
    });
  }

  aceptarPedido(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoAceptarPedido> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{ resultado: ResultadoAceptarPedido }>(
        'select * from app.aceptar_pedido($1, $2)',
        [domiciliarioId, solicitudId],
      );
      return result.rows[0].resultado;
    });
  }

  marcarMedicamentosRecogidos(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoTransicionPedido> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoTransicionPedido;
      }>('select * from app.marcar_medicamentos_recogidos($1, $2)', [
        domiciliarioId,
        solicitudId,
      ]);
      return result.rows[0].resultado;
    });
  }

  iniciarEntrega(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoTransicionPedido> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoTransicionPedido;
      }>('select * from app.iniciar_entrega($1, $2)', [
        domiciliarioId,
        solicitudId,
      ]);
      return result.rows[0].resultado;
    });
  }

  marcarEnSitio(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<ResultadoTransicionPedido> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoTransicionPedido;
      }>('select * from app.marcar_en_sitio($1, $2)', [
        domiciliarioId,
        solicitudId,
      ]);
      return result.rows[0].resultado;
    });
  }

  entregarPedido(
    domiciliarioId: string,
    solicitudId: string,
    codigo: string,
  ): Promise<ResultadoEntregarPedido> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{ resultado: ResultadoEntregarPedido }>(
        'select * from app.entregar_pedido($1, $2, $3)',
        [domiciliarioId, solicitudId, codigo],
      );
      return result.rows[0].resultado;
    });
  }

  reportarNovedad(
    domiciliarioId: string,
    solicitudId: string,
    detalle: string,
  ): Promise<ResultadoReportarNovedad> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<{
        resultado: string;
        id: string | null;
      }>('select * from app.reportar_novedad($1, $2, $3)', [
        domiciliarioId,
        solicitudId,
        detalle,
      ]);
      const fila = result.rows[0];
      if (fila.resultado === 'reportada' && fila.id) {
        return { resultado: 'reportada', id: fila.id };
      }
      return { resultado: 'no_encontrado' };
    });
  }

  obtenerPedidoActivo(
    domiciliarioId: string,
  ): Promise<PedidoActivoDomiciliario | null> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaPedidoActivoDomiciliario>(
        'select * from app.obtener_pedido_activo_domiciliario($1)',
        [domiciliarioId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return {
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        direccionEntrega: fila.direccion_entrega,
        direccionFarmacia: fila.direccion_farmacia,
        creadoEn: fila.creado_en,
      };
    });
  }

  listarHistorialPedidoActivo(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaHistorial>(
        'select * from app.listar_historial_pedido_domiciliario($1, $2)',
        [domiciliarioId, solicitudId],
      );
      return result.rows.map((fila) => ({
        estado: fila.estado,
        creadoEn: fila.creado_en,
      }));
    });
  }

  obtenerNovedadPropiaAbierta(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<NovedadDelPaciente | null> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaNovedadDelPaciente>(
        'select * from app.obtener_novedad_propia_abierta($1, $2)',
        [domiciliarioId, solicitudId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return { id: fila.id, detalle: fila.detalle, creadoEn: fila.creado_en };
    });
  }

  obtenerDocumentosPacienteParaRecoger(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<DocumentosPacienteParaRecoger | null> {
    return this.db.withUserContext(domiciliarioId, async (client) => {
      const result = await client.query<FilaDocumentosPacienteParaRecoger>(
        'select * from app.obtener_documentos_paciente_para_recoger($1, $2)',
        [domiciliarioId, solicitudId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return {
        cedulaFrentePath: fila.cedula_frente_path,
        cedulaReversoPath: fila.cedula_reverso_path,
      };
    });
  }

  listarNovedadesAbiertas(adminId: string): Promise<NovedadAbierta[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaNovedadAbierta>(
        'select * from app.listar_novedades_abiertas($1)',
        [adminId],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        solicitudId: fila.solicitud_id,
        codigoPedido: fila.codigo_pedido,
        detalle: fila.detalle,
        reportadaPorCorreo: fila.reportada_por_correo,
        origen: fila.origen,
        tipo: fila.tipo,
        datosActuales: datosEdicionDesde(fila.datos_actuales),
        datosPropuestos: datosEdicionDesde(fila.datos_propuestos),
        codigoEntrega: fila.codigo_entrega,
        recetaPathActual: fila.receta_path,
        creadoEn: fila.creado_en,
      }));
    });
  }

  resolverNovedad(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoResolverNovedad> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoResolverNovedad;
      }>('select * from app.resolver_novedad($1, $2)', [adminId, novedadId]);
      return result.rows[0].resultado;
    });
  }

  listarPedidosAdmin(
    adminId: string,
    filtros: FiltrosPedidosAdmin,
  ): Promise<PedidoAdmin[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaPedidoAdmin>(
        'select * from app.listar_pedidos_admin($1, $2, $3, $4, $5, $6, $7)',
        [
          adminId,
          filtros.estado ?? null,
          filtros.desde ?? null,
          filtros.hasta ?? null,
          filtros.busqueda ?? null,
          filtros.pacienteBusqueda ?? null,
          filtros.domiciliarioBusqueda ?? null,
        ],
      );
      return result.rows.map((fila) => ({
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        pacienteNombre: fila.paciente_nombre,
        pacienteCorreo: fila.paciente_correo,
        domiciliarioNombre: fila.domiciliario_nombre,
        domiciliarioCorreo: fila.domiciliario_correo,
        direccionEntrega: fila.direccion_entrega,
        direccionFarmacia: fila.direccion_farmacia,
        creadoEn: fila.creado_en,
        enviadoEn: fila.enviado_en,
        enAsignacionDesde: fila.en_asignacion_desde,
      }));
    });
  }

  obtenerPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<PedidoAdminDetalle | null> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaPedidoAdminDetalle>(
        'select * from app.obtener_pedido_admin($1, $2)',
        [adminId, solicitudId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return {
        id: fila.id,
        codigoPedido: fila.codigo_pedido,
        estado: fila.estado,
        recetaPath: fila.receta_path,
        recetaFechaVencimiento: fila.receta_fecha_vencimiento,
        direccionEntrega: fila.direccion_entrega,
        direccionFarmacia: fila.direccion_farmacia,
        creadoEn: fila.creado_en,
        enviadoEn: fila.enviado_en,
        canceladoEn: fila.cancelado_en,
        codigoEntrega: fila.codigo_entrega,
        pacienteNombre: fila.paciente_nombre,
        pacienteCorreo: fila.paciente_correo,
        pacienteTelefono: fila.paciente_telefono,
        pacienteCedulaFrentePath: fila.paciente_cedula_frente_path,
        pacienteCedulaReversoPath: fila.paciente_cedula_reverso_path,
        domiciliarioNombre: fila.domiciliario_nombre,
        domiciliarioCorreo: fila.domiciliario_correo,
        domiciliarioTelefono: fila.domiciliario_telefono,
        enAsignacionDesde: fila.en_asignacion_desde,
      };
    });
  }

  listarMedicamentosPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<Medicamento[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaMedicamento>(
        'select * from app.listar_medicamentos_pedido_admin($1, $2)',
        [adminId, solicitudId],
      );
      return result.rows.map((fila) => ({
        nombre: fila.nombre,
        concentracion: fila.concentracion,
        formaFarmaceutica: fila.forma_farmaceutica,
        cantidad: fila.cantidad,
        posologia: fila.posologia,
      }));
    });
  }

  listarHistorialPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<EventoHistorial[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaHistorial>(
        'select * from app.listar_historial_pedido_admin($1, $2)',
        [adminId, solicitudId],
      );
      return result.rows.map((fila) => ({
        estado: fila.estado,
        creadoEn: fila.creado_en,
      }));
    });
  }

  obtenerNovedadAbiertaPedidoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<NovedadAbiertaPedidoAdmin | null> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaNovedadAbiertaPedidoAdmin>(
        'select * from app.obtener_novedad_abierta_pedido_admin($1, $2)',
        [adminId, solicitudId],
      );
      if (!result.rowCount) {
        return null;
      }
      const fila = result.rows[0];
      return {
        id: fila.id,
        detalle: fila.detalle,
        origen: fila.origen,
        tipo: fila.tipo,
        datosActuales: datosEdicionDesde(fila.datos_actuales),
        datosPropuestos: datosEdicionDesde(fila.datos_propuestos),
        creadoEn: fila.creado_en,
      };
    });
  }

  reportarNovedadPaciente(
    pacienteId: string,
    solicitudId: string,
    detalle: string,
  ): Promise<ResultadoReportarNovedad> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{
        resultado: string;
        id: string | null;
      }>('select * from app.reportar_novedad_paciente($1, $2, $3)', [
        pacienteId,
        solicitudId,
        detalle,
      ]);
      const fila = result.rows[0];
      if (fila.resultado === 'reportada' && fila.id) {
        return { resultado: 'reportada', id: fila.id };
      }
      return { resultado: 'no_encontrado' };
    });
  }

  solicitarEdicionPedido(
    pacienteId: string,
    solicitudId: string,
    direccionEntrega: string | null,
    direccionFarmacia: string | null,
    detalle: string | null,
    medicamentos: Medicamento[] | null,
    incluyeReceta: boolean,
  ): Promise<ResultadoReportarNovedad> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{
        resultado: string;
        id: string | null;
      }>(
        'select * from app.solicitar_edicion_pedido($1, $2, $3, $4, $5, $6::jsonb, $7)',
        [
          pacienteId,
          solicitudId,
          direccionEntrega,
          direccionFarmacia,
          detalle,
          medicamentos && medicamentos.length > 0
            ? JSON.stringify(medicamentos)
            : null,
          incluyeReceta,
        ],
      );
      const fila = result.rows[0];
      if (fila.resultado === 'reportada' && fila.id) {
        return { resultado: 'reportada', id: fila.id };
      }
      return { resultado: 'no_encontrado' };
    });
  }

  adjuntarRecetaPropuestaEdicion(
    pacienteId: string,
    novedadId: string,
    recetaPath: string,
  ): Promise<boolean> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{ resultado: string }>(
        'select * from app.adjuntar_receta_propuesta_edicion($1, $2, $3)',
        [pacienteId, novedadId, recetaPath],
      );
      return result.rows[0].resultado === 'actualizado';
    });
  }

  reportarCodigoNoGenerado(
    pacienteId: string,
    solicitudId: string,
    detalle: string | null,
  ): Promise<ResultadoReportarNovedad> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{
        resultado: string;
        id: string | null;
      }>('select * from app.reportar_codigo_no_generado($1, $2, $3)', [
        pacienteId,
        solicitudId,
        detalle,
      ]);
      const fila = result.rows[0];
      if (fila.resultado === 'reportada' && fila.id) {
        return { resultado: 'reportada', id: fila.id };
      }
      return { resultado: 'no_encontrado' };
    });
  }

  aprobarEdicionPedidoAdmin(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoAccionEdicionPedido> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoAccionEdicionPedido;
      }>('select * from app.aprobar_edicion_pedido_admin($1, $2)', [
        adminId,
        novedadId,
      ]);
      return result.rows[0].resultado;
    });
  }

  rechazarEdicionPedidoAdmin(
    adminId: string,
    novedadId: string,
  ): Promise<ResultadoAccionEdicionPedido> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoAccionEdicionPedido;
      }>('select * from app.rechazar_edicion_pedido_admin($1, $2)', [
        adminId,
        novedadId,
      ]);
      return result.rows[0].resultado;
    });
  }

  regenerarCodigoEntregaAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<ResultadoRegenerarCodigoEntrega> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoRegenerarCodigoEntrega['resultado'];
        codigo_entrega: string | null;
      }>('select * from app.regenerar_codigo_entrega_admin($1, $2)', [
        adminId,
        solicitudId,
      ]);
      const fila = result.rows[0];
      return { resultado: fila.resultado, codigoEntrega: fila.codigo_entrega };
    });
  }

  obtenerCodigoEntregaParaCorreoAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<CodigoEntregaParaCorreo> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: CodigoEntregaParaCorreo['resultado'];
        codigo_entrega: string | null;
        codigo_pedido: string | null;
        paciente_correo: string | null;
        paciente_nombre: string | null;
      }>(
        'select * from app.obtener_codigo_entrega_para_correo_admin($1, $2)',
        [adminId, solicitudId],
      );
      const fila = result.rows[0];
      return {
        resultado: fila.resultado,
        codigoEntrega: fila.codigo_entrega,
        codigoPedido: fila.codigo_pedido,
        pacienteCorreo: fila.paciente_correo,
        pacienteNombre: fila.paciente_nombre,
      };
    });
  }

  listarDomiciliariosCercanosAdmin(
    adminId: string,
    solicitudId: string,
  ): Promise<DomiciliarioCercanoAdmin[]> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaDomiciliarioCercanoAdmin>(
        'select * from app.listar_domiciliarios_cercanos_admin($1, $2)',
        [adminId, solicitudId],
      );
      return result.rows.map((fila) => ({
        usuarioId: fila.usuario_id,
        nombreCompleto: fila.nombre_completo,
        telefono: fila.telefono,
        distanciaMetros: fila.distancia_metros,
      }));
    });
  }

  asignarDomiciliarioAdmin(
    adminId: string,
    solicitudId: string,
    domiciliarioId: string,
  ): Promise<ResultadoAsignarDomiciliarioAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoAsignarDomiciliarioAdmin;
      }>('select * from app.asignar_domiciliario_admin($1, $2, $3)', [
        adminId,
        solicitudId,
        domiciliarioId,
      ]);
      return result.rows[0].resultado;
    });
  }

  obtenerConfiguracionAdmin(
    adminId: string,
  ): Promise<ConfiguracionAdmin | null> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<FilaConfiguracionAdmin>(
        'select * from app.obtener_configuracion_admin($1)',
        [adminId],
      );
      if (!result.rowCount) {
        return null;
      }
      return {
        umbralDemoraAsignacionMinutos:
          result.rows[0].umbral_demora_asignacion_minutos,
      };
    });
  }

  actualizarConfiguracionAdmin(
    adminId: string,
    umbralMinutos: number,
  ): Promise<ResultadoActualizarConfiguracionAdmin> {
    return this.db.withUserContext(adminId, async (client) => {
      const result = await client.query<{
        resultado: ResultadoActualizarConfiguracionAdmin;
      }>('select * from app.actualizar_configuracion_admin($1, $2)', [
        adminId,
        umbralMinutos,
      ]);
      return result.rows[0].resultado;
    });
  }
}
