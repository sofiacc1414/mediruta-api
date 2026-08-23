import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  EstadoSolicitud,
  EventoHistorial,
  Medicamento,
  ResultadoCancelar,
  ResultadoCrear,
  ResultadoEnviar,
  SolicitudDetalle,
  SolicitudRepositoryPort,
  SolicitudResumen,
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
  cedula_path: string | null;
};

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
        cedulaPath: fila.cedula_path,
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

  enviar(pacienteId: string, solicitudId: string): Promise<ResultadoEnviar> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<FilaEnviar>(
        'select * from app.enviar_solicitud($1, $2)',
        [pacienteId, solicitudId],
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
}
