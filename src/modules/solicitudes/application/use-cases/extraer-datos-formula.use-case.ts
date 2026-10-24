import { Injectable } from '@nestjs/common';
import {
  FormulaMedicaExtraida,
  OcrFormulaPort,
} from '../../domain/ports/ocr-formula.port';

@Injectable()
export class ExtraerDatosFormulaUseCase {
  constructor(private readonly ocrFormula: OcrFormulaPort) {}

  execute(
    contenido: Buffer,
    contentType: string,
  ): Promise<FormulaMedicaExtraida> {
    return this.ocrFormula.extraer(contenido, contentType);
  }
}
