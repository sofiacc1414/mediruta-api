import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calcularCantidadDesdePosologia } from '../../domain/calcular-cantidad-posologia';
import { ArchivoFormulaInvalidoError } from '../../domain/errors/archivo-formula-invalido.error';
import { ImagenFormulaIlegibleError } from '../../domain/errors/imagen-formula-ilegible.error';
import {
  FormulaMedicaExtraida,
  OcrFormulaPort,
} from '../../domain/ports/ocr-formula.port';
import { Medicamento } from '../../domain/ports/solicitud.repository.port';

type MedicamentoOcr = {
  nombre: string;
  dosis: string | null;
  forma_farmaceutica: string | null;
  cantidad: string | null;
  frecuencia: string | null;
  via_administracion: string | null;
  duracion: string | null;
  instrucciones: string | null;
};

type RespuestaOcrServicio = {
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  farmacia_ips_origen: string | null;
  medicamentos: MedicamentoOcr[];
};

/** Adaptador hacia mediruta-ocr-service (microservicio Python, FastAPI
 * + OpenCV + Tesseract). Mismo criterio que
 * `NominatimGeocodificacionAdapter`: `fetch` global (Node >=24), sin
 * `@nestjs/axios`. */
@Injectable()
export class HttpOcrFormulaAdapter extends OcrFormulaPort {
  private readonly logger = new Logger(HttpOcrFormulaAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async extraer(
    contenido: Buffer,
    contentType: string,
  ): Promise<FormulaMedicaExtraida> {
    const urlBase = this.config.get<string>('OCR_SERVICE_URL');
    if (!urlBase) {
      throw new Error('Falta la variable de entorno OCR_SERVICE_URL.');
    }

    const formulario = new FormData();
    // `Buffer` es un `Uint8Array` sobre `ArrayBufferLike` (puede ser un
    // `SharedArrayBuffer`), que el tipo `BlobPart` del lib DOM no
    // acepta — `Uint8Array.from` copia a un `ArrayBuffer` plano para
    // satisfacer el tipo (el archivo nunca pasa de 10MB, la copia es
    // intrascendente).
    formulario.append(
      'archivo',
      new Blob([Uint8Array.from(contenido)], { type: contentType }),
      'formula',
    );

    const respuesta = await fetch(`${urlBase}/formulas/procesar`, {
      method: 'POST',
      body: formulario,
    });

    if (respuesta.status === 400) {
      throw new ArchivoFormulaInvalidoError(await this.detalleError(respuesta));
    }
    if (respuesta.status === 422) {
      throw new ImagenFormulaIlegibleError(await this.detalleError(respuesta));
    }
    if (!respuesta.ok) {
      this.logger.error(
        `mediruta-ocr-service respondió ${respuesta.status} procesando una fórmula.`,
      );
      throw new Error(
        `El servicio de lectura de fórmulas respondió con un error (${respuesta.status}).`,
      );
    }

    const datos = (await respuesta.json()) as RespuestaOcrServicio;
    return this.aFormulaExtraida(datos);
  }

  private async detalleError(respuesta: Response): Promise<string> {
    try {
      const cuerpo = (await respuesta.json()) as { detail?: string };
      return cuerpo.detail ?? 'El archivo de la fórmula no pudo procesarse.';
    } catch {
      return 'El archivo de la fórmula no pudo procesarse.';
    }
  }

  private aFormulaExtraida(datos: RespuestaOcrServicio): FormulaMedicaExtraida {
    return {
      fechaEmision: datos.fecha_emision,
      fechaVencimiento: datos.fecha_vencimiento,
      farmaciaIpsOrigen: datos.farmacia_ips_origen,
      medicamentos: datos.medicamentos.map((m) => this.aMedicamento(m)),
    };
  }

  private aMedicamento(m: MedicamentoOcr): Medicamento {
    const posologia = this.posologiaDesde(m);
    return {
      nombre: m.nombre,
      concentracion: m.dosis,
      formaFarmaceutica: m.forma_farmaceutica,
      // Caso real reportado: la fórmula no siempre trae `cantidad`
      // explícita, pero si la posología trae frecuencia y duración
      // ("cada 6 horas durante 3 días"), es calculable — evita que el
      // paciente se tope con un campo obligatorio vacío sin aviso.
      // Si no es calculable (ej. "a libre demanda"), queda `null`
      // igual que antes — nunca se inventa un número.
      cantidad: m.cantidad ?? calcularCantidadDesdePosologia(posologia),
      posologia,
    };
  }

  // Cuando la fórmula trae la posología como frase libre (ej. "Aplicar
  // dos gotas por ojo durante 350 días"), esa frase ya es más completa
  // y legible que cualquier recombinación de frecuencia/vía/duración —
  // se usa tal cual en vez de reconstruirla. Solo se arma por partes
  // cuando el documento sí las trae separadas (filas tabuladas con
  // etiquetas Via/Frecuencia/Duración).
  private posologiaDesde(m: MedicamentoOcr): string | null {
    if (m.instrucciones) return m.instrucciones;
    const partes = [m.frecuencia, m.via_administracion, m.duracion].filter(
      (parte): parte is string => !!parte,
    );
    return partes.length > 0 ? partes.join(' · ') : null;
  }
}
