import { Logger } from '@nestjs/common';
import { NominatimGeocodificacionAdapter } from './nominatim-geocodificacion.adapter';

function respuestaJson(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('NominatimGeocodificacionAdapter', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('arma la consulta con dirección, ciudad, departamento y Colombia', async () => {
    fetchMock.mockResolvedValue(respuestaJson([{ lat: '4.65', lon: '-74.06' }]));
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', 'Bogotá', 'Cundinamarca');

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe(
      'Calle 80 # 20-15, Bogotá, Cundinamarca, Colombia',
    );
    expect(url.searchParams.get('countrycodes')).toBe('co');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it('manda un User-Agent identificable (lo exige Nominatim)', async () => {
    fetchMock.mockResolvedValue(respuestaJson([{ lat: '4.65', lon: '-74.06' }]));
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', 'Bogotá', 'Cundinamarca');

    const [, opciones] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect((opciones.headers as Record<string, string>)['User-Agent']).toContain(
      'MediRuta',
    );
  });

  it('omite ciudad/departamento nulos sin dejar comas de más', async () => {
    fetchMock.mockResolvedValue(respuestaJson([{ lat: '4.65', lon: '-74.06' }]));
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', null, null);

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe('Calle 80 # 20-15, Colombia');
  });

  it('devuelve lat/lng numéricos del primer resultado', async () => {
    fetchMock.mockResolvedValue(respuestaJson([{ lat: '4.6486', lon: '-74.0628' }]));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar('Calle 80', 'Bogotá', 'Cundinamarca');

    expect(resultado).toEqual({ lat: 4.6486, lng: -74.0628 });
  });

  it('devuelve null si no hay resultados', async () => {
    fetchMock.mockResolvedValue(respuestaJson([]));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar('dirección inventada', null, null);

    expect(resultado).toBeNull();
  });

  it('devuelve null (no lanza) si Nominatim responde con error HTTP', async () => {
    fetchMock.mockResolvedValue(respuestaJson(null, false, 503));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar('Calle 80', 'Bogotá', 'Cundinamarca');

    expect(resultado).toBeNull();
  });

  it('devuelve null (no lanza) si falla la conexión', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar('Calle 80', 'Bogotá', 'Cundinamarca');

    expect(resultado).toBeNull();
  });
});
