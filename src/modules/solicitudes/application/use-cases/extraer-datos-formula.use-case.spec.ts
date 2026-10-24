import { OcrFormulaPort } from '../../domain/ports/ocr-formula.port';
import { ExtraerDatosFormulaUseCase } from './extraer-datos-formula.use-case';

describe('ExtraerDatosFormulaUseCase', () => {
  it('delega directamente en el puerto de OCR', async () => {
    const resultado = {
      fechaEmision: '2026-01-12',
      farmaciaIpsOrigen: 'IPS Clínica Las Vegas',
      medicamentos: [],
    };
    const ocrFormula: OcrFormulaPort = {
      extraer: jest.fn().mockResolvedValue(resultado),
    };
    const useCase = new ExtraerDatosFormulaUseCase(ocrFormula);

    const contenido = Buffer.from('contenido');
    const respuesta = await useCase.execute(contenido, 'image/png');

    expect(ocrFormula.extraer).toHaveBeenCalledWith(contenido, 'image/png');
    expect(respuesta).toBe(resultado);
  });
});
