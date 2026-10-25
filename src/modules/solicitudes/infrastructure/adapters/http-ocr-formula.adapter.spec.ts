import { ConfigService } from '@nestjs/config';
import { ArchivoFormulaInvalidoError } from '../../domain/errors/archivo-formula-invalido.error';
import { ImagenFormulaIlegibleError } from '../../domain/errors/imagen-formula-ilegible.error';
import { HttpOcrFormulaAdapter } from './http-ocr-formula.adapter';

function respuestaJson(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function configConUrl(url: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(url) } as unknown as ConfigService;
}

describe('HttpOcrFormulaAdapter', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('lanza error si falta OCR_SERVICE_URL', async () => {
    const adapter = new HttpOcrFormulaAdapter(configConUrl(undefined));

    await expect(
      adapter.extraer(Buffer.from('x'), 'image/png'),
    ).rejects.toThrow('Falta la variable de entorno OCR_SERVICE_URL.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mapea la respuesta exitosa al formato del dominio (Medicamento)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({
        fecha_emision: '2026-01-12',
        fecha_vencimiento: '2026-02-12',
        farmacia_ips_origen: 'IPS Clínica Las Vegas',
        medicamentos: [
          {
            nombre: 'Acetaminofen',
            dosis: '500mg',
            forma_farmaceutica: 'TABLETA',
            cantidad: '10 DIEZ TABLETA',
            frecuencia: 'cada 8 horas',
            via_administracion: 'oral',
            duracion: 'por 5 dias',
            instrucciones: null,
          },
        ],
      }),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    const resultado = await adapter.extraer(
      Buffer.from('contenido'),
      'image/png',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/formulas/procesar',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(resultado).toEqual({
      fechaEmision: '2026-01-12',
      fechaVencimiento: '2026-02-12',
      farmaciaIpsOrigen: 'IPS Clínica Las Vegas',
      medicamentos: [
        {
          nombre: 'Acetaminofen',
          concentracion: '500mg',
          formaFarmaceutica: 'TABLETA',
          cantidad: '10 DIEZ TABLETA',
          posologia: 'cada 8 horas · oral · por 5 dias',
        },
      ],
    });
  });

  it('caso real reportado: calcula cantidad desde dosis_toma/frecuencia/duracion (formato real del microservicio)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({
        fecha_emision: null,
        fecha_vencimiento: null,
        farmacia_ips_origen: null,
        medicamentos: [
          {
            nombre: 'ACETAMINOFEN',
            dosis: '500MG',
            forma_farmaceutica: 'TAB',
            cantidad: null,
            frecuencia: 'cada 6 horas',
            via_administracion: null,
            duracion: 'durante 3 dia',
            instrucciones: null,
            dosis_toma: 'Tomar 1 tableta',
          },
          {
            nombre: 'LOMOTIL',
            dosis: '2MG',
            forma_farmaceutica: 'TAB',
            cantidad: null,
            frecuencia: 'cada 8 horas',
            via_administracion: null,
            duracion: 'durante 1 dia',
            instrucciones: null,
            dosis_toma: 'Tomar 1 tableta',
          },
          {
            // "A libre demanda" — no hay frecuencia/duración/dosis por
            // toma reconocibles, debe quedar null.
            nombre: 'SALES REHIDRATANTES',
            dosis: null,
            forma_farmaceutica: 'SOB',
            cantidad: null,
            frecuencia: null,
            via_administracion: null,
            duracion: null,
            instrucciones: null,
            dosis_toma: null,
          },
        ],
      }),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    const resultado = await adapter.extraer(
      Buffer.from('contenido'),
      'image/png',
    );

    expect(resultado.medicamentos[0].cantidad).toBe('12 tableta(s) (calculado)');
    expect(resultado.medicamentos[1].cantidad).toBe('3 tableta(s) (calculado)');
    expect(resultado.medicamentos[2].cantidad).toBeNull();
  });

  it('respaldo: calcula cantidad desde la posología en texto libre cuando no vienen campos estructurados', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({
        fecha_emision: null,
        fecha_vencimiento: null,
        farmacia_ips_origen: null,
        medicamentos: [
          {
            nombre: 'Acetaminofen',
            dosis: '500mg',
            forma_farmaceutica: 'TAB',
            cantidad: null,
            frecuencia: null,
            via_administracion: null,
            duracion: null,
            instrucciones:
              'Tomar 1 tableta (s) cada 6 horas durante 3 dia (s)',
          },
          {
            // "A libre demanda" — no hay cantidad determinística, debe
            // quedar null para que la app lo marque como pendiente.
            nombre: 'Sales rehidratantes',
            dosis: null,
            forma_farmaceutica: 'SOB',
            cantidad: null,
            frecuencia: null,
            via_administracion: null,
            duracion: null,
            instrucciones: 'A LIBRE DEMANDA',
          },
        ],
      }),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    const resultado = await adapter.extraer(
      Buffer.from('contenido'),
      'image/png',
    );

    expect(resultado.medicamentos[0].cantidad).toBe('12 tableta(s) (calculado)');
    expect(resultado.medicamentos[1].cantidad).toBeNull();
  });

  it('medicamento sin frecuencia/vía/duración detectadas deja posologia en null', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({
        fecha_emision: null,
        fecha_vencimiento: null,
        farmacia_ips_origen: null,
        medicamentos: [
          {
            nombre: 'Ibuprofeno',
            dosis: '400mg',
            forma_farmaceutica: null,
            cantidad: null,
            frecuencia: null,
            via_administracion: null,
            duracion: null,
            instrucciones: null,
          },
        ],
      }),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    const resultado = await adapter.extraer(
      Buffer.from('contenido'),
      'image/png',
    );

    expect(resultado.medicamentos[0].posologia).toBeNull();
  });

  it('cuando el microservicio trae instrucciones en texto libre, se usan tal cual (no se reconstruyen)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({
        fecha_emision: null,
        fecha_vencimiento: null,
        farmacia_ips_origen: null,
        medicamentos: [
          {
            nombre: 'Eye-sul',
            dosis: '20 ml',
            forma_farmaceutica: null,
            cantidad: null,
            frecuencia: null,
            via_administracion: null,
            duracion: 'durante 350 días',
            instrucciones: 'Aplicar dos gotas por ojo durante 350 días.',
          },
        ],
      }),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    const resultado = await adapter.extraer(
      Buffer.from('contenido'),
      'image/png',
    );

    expect(resultado.medicamentos[0].posologia).toBe(
      'Aplicar dos gotas por ojo durante 350 días.',
    );
  });

  it('400 del microservicio se traduce a ArchivoFormulaInvalidoError', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson({ detail: 'Formato no soportado.' }, false, 400),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    await expect(
      adapter.extraer(Buffer.from('x'), 'image/png'),
    ).rejects.toThrow(ArchivoFormulaInvalidoError);
    await expect(
      adapter.extraer(Buffer.from('x'), 'image/png'),
    ).rejects.toThrow('Formato no soportado.');
  });

  it('422 del microservicio se traduce a ImagenFormulaIlegibleError', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson(
        { detail: 'La imagen no es lo suficientemente clara.' },
        false,
        422,
      ),
    );
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    await expect(
      adapter.extraer(Buffer.from('x'), 'image/png'),
    ).rejects.toThrow(ImagenFormulaIlegibleError);
    await expect(
      adapter.extraer(Buffer.from('x'), 'image/png'),
    ).rejects.toThrow('La imagen no es lo suficientemente clara.');
  });

  it('cualquier otro status se traduce a un error genérico', async () => {
    fetchMock.mockResolvedValue(respuestaJson(null, false, 500));
    const adapter = new HttpOcrFormulaAdapter(
      configConUrl('http://localhost:8001'),
    );

    await expect(
      adapter.extraer(Buffer.from('x'), 'image/png'),
    ).rejects.toThrow(
      'El servicio de lectura de fórmulas respondió con un error (500).',
    );
  });
});
