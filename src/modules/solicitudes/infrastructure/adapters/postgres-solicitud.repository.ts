import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../shared/infrastructure/database/database.service';
import {
  DatosSolicitud,
  EstadoSolicitud,
  EventoHistorial,
  ResultadoCancelar,
  ResultadoEnviar,
  SolicitudDetalle,
  SolicitudRepositoryPort,
  SolicitudResumen,
} from '../../domain/ports/solicitud.repository.port';

type FilaResumen = {
  id: string;
  medicamento_nombre: string | null;
  estado: EstadoSolicitud;
  creado_en: string;
};

type FilaDetalle = {
  id: string;
  estado: EstadoSolicitud;
  medicamento_nombre: string | null;
  medicamento_concentracion: string | null;
  medicamento_forma_farmaceutica: string | null;
  medicamento_cantidad: string | null;
  medicamento_posologia: string | null;
  receta_medico_nombre: string | null;
  receta_medico_registro: string | null;
  receta_ips: string | null;
  receta_fecha_expedicion: string | null;
  direccion_entrega: string | null;
  creado_en: string;
  enviado_en: string | null;
  cancelado_en: string | null;
};

type FilaHistorial = { estado: EstadoSolicitud; creado_en: string };

type FilaEnviar = { resultado: string; faltantes: string[] | null };

/** Todo acotado al paciente dueño (nunca a otra cuenta) — pacienteId
 * siempre es identidad.usuarioId del JWT, no algo que mande el cliente. */
@Injectable()
export class PostgresSolicitudRepository extends SolicitudRepositoryPort {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  crear(pacienteId: string, datos: DatosSolicitud): Promise<string | null> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{ crear_solicitud: string | null }>(
        `select app.crear_solicitud($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           as crear_solicitud`,
        [
          pacienteId,
          datos.medicamentoNombre,
          datos.medicamentoConcentracion,
          datos.medicamentoFormaFarmaceutica,
          datos.medicamentoCantidad,
          datos.medicamentoPosologia,
          datos.recetaMedicoNombre,
          datos.recetaMedicoRegistro,
          datos.recetaIps,
          datos.recetaFechaExpedicion,
          datos.direccionEntrega,
        ],
      );
      return result.rows[0].crear_solicitud;
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
        medicamentoNombre: fila.medicamento_nombre,
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
        estado: fila.estado,
        medicamentoNombre: fila.medicamento_nombre,
        medicamentoConcentracion: fila.medicamento_concentracion,
        medicamentoFormaFarmaceutica: fila.medicamento_forma_farmaceutica,
        medicamentoCantidad: fila.medicamento_cantidad,
        medicamentoPosologia: fila.medicamento_posologia,
        recetaMedicoNombre: fila.receta_medico_nombre,
        recetaMedicoRegistro: fila.receta_medico_registro,
        recetaIps: fila.receta_ips,
        recetaFechaExpedicion: fila.receta_fecha_expedicion,
        direccionEntrega: fila.direccion_entrega,
        creadoEn: fila.creado_en,
        enviadoEn: fila.enviado_en,
        canceladoEn: fila.cancelado_en,
      };
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
    datos: DatosSolicitud,
  ): Promise<boolean> {
    return this.db.withUserContext(pacienteId, async (client) => {
      const result = await client.query<{ actualizar_solicitud: boolean }>(
        `select app.actualizar_solicitud(
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
         ) as actualizar_solicitud`,
        [
          pacienteId,
          solicitudId,
          datos.medicamentoNombre,
          datos.medicamentoConcentracion,
          datos.medicamentoFormaFarmaceutica,
          datos.medicamentoCantidad,
          datos.medicamentoPosologia,
          datos.recetaMedicoNombre,
          datos.recetaMedicoRegistro,
          datos.recetaIps,
          datos.recetaFechaExpedicion,
          datos.direccionEntrega,
        ],
      );
      return result.rows[0].actualizar_solicitud;
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
      if (fila.resultado === 'enviada' || fila.resultado === 'no_encontrada') {
        return { resultado: fila.resultado };
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
