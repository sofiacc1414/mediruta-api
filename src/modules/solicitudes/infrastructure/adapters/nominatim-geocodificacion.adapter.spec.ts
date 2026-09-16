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
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('arma la consulta con dirección, ciudad, departamento y Colombia', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.65', lon: '-74.06' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', 'Bogotá', 'Cundinamarca');

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe(
      'Calle 80 # 20-15, Bogotá, Cundinamarca, Colombia',
    );
    expect(url.searchParams.get('countrycodes')).toBe('co');
    expect(url.searchParams.get('limit')).toBe('5');
  });

  it('pide addressdetails=1 (necesario para leer house_number)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.65', lon: '-74.06' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', 'Bogotá', 'Cundinamarca');

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('addressdetails')).toBe('1');
  });

  it('manda un User-Agent identificable (lo exige Nominatim)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.65', lon: '-74.06' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', 'Bogotá', 'Cundinamarca');

    const [, opciones] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(
      (opciones.headers as Record<string, string>)['User-Agent'],
    ).toContain('MediRuta');
  });

  it('normaliza "num"/"número"/"no." a "#" antes de consultar (Nominatim no resuelve la palabra)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '6.1869475', lon: '-75.6510397' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar(
      'calle 38 sur num 77-100 san Antonio de prado',
      'Medellín',
      'Antioquia',
    );

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe(
      'calle 38 sur # 77-100 san Antonio de prado, Medellín, Antioquia, Colombia',
    );
  });

  it.each([
    ['Carrera 43A No. 5 Sur-100', 'Carrera 43A # 5 Sur-100'],
    ['Cra 43 numero 5-100', 'Cra 43 # 5-100'],
    ['Calle 10 Núm. 20-30', 'Calle 10 # 20-30'],
    ['Calle 10 N. 5-20', 'Calle 10 # 5-20'],
    ['Cra 43 Nro 5-100', 'Cra 43 # 5-100'],
    ['Cra 43 Nro. 5-100', 'Cra 43 # 5-100'],
  ])('normaliza otras variantes: "%s"', async (entrada, esperado) => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.65', lon: '-74.06' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar(entrada, null, null);

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe(`${esperado}, Colombia`);
  });

  it('no toca "no" cuando no es un numeral (palabra común, ni "Norte")', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.65', lon: '-74.06' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Avenida Norte con Calle 5', null, null);

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe(
      'Avenida Norte con Calle 5, Colombia',
    );
  });

  it('omite ciudad/departamento nulos sin dejar comas de más', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.65', lon: '-74.06' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    await adapter.geocodificar('Calle 80 # 20-15', null, null);

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.get('q')).toBe('Calle 80 # 20-15, Colombia');
  });

  it('devuelve lat/lng numéricos del primer resultado, precisa=true por defecto', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.6486', lon: '-74.0628' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'Calle 80',
      'Bogotá',
      'Cundinamarca',
    );

    expect(resultado).toEqual({
      lat: 4.6486,
      lng: -74.0628,
      direccionResuelta: 'Calle 80', // sin display_name, cae al texto original
      precisa: true,
    });
  });

  it('usa los primeros 3 segmentos de display_name como direccionResuelta', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([
        {
          lat: '4.6486',
          lon: '-74.0628',
          display_name:
            'Carrera 43A, El Poblado, Comuna 14 - El Poblado, Perímetro Urbano Medellín, Medellín, Antioquia, Colombia',
        },
      ]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'Carrera 43A',
      'Medellín',
      'Antioquia',
    );

    expect(resultado?.direccionResuelta).toBe(
      'Carrera 43A, El Poblado, Comuna 14 - El Poblado',
    );
  });

  // Bug real reportado: al confirmar una dirección, el barrio/comuna
  // y la ciudad no se veían — son justo el dato que permite notar un
  // resultado equivocado (ej. "Guayabal" vs "Belén", dos comunas bien
  // distintas de Medellín). El recorte por posición en `display_name`
  // se quedaba en "calle, sub-barrio, comuna" SIN la ciudad (que
  // aparece más adelante, después de un segmento de puro ruido
  // administrativo). Ahora se arma desde los campos estructurados de
  // `address` en vez de adivinar por posición.
  describe('direccionResuelta construida desde los campos estructurados de address', () => {
    it('incluye el barrio/comuna (suburb) y la ciudad, aunque display_name los tenga separados por ruido administrativo', async () => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '6.2284773',
            lon: '-75.5849215',
            address: {
              road: 'Calle 27',
              neighbourhood: 'Trinidad',
              suburb: 'Comuna 15 - Guayabal',
              city: 'Perímetro Urbano Medellín',
            },
            display_name:
              'Calle 27, Trinidad, Comuna 15 - Guayabal, Perímetro Urbano Medellín, Medellín, Antioquia, Colombia',
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('Calle 27', 'Medellín', 'Antioquia');

      // "Perímetro Urbano " se limpia del nombre de la ciudad, y
      // `suburb` (la comuna) se prefiere sobre `neighbourhood` (el
      // sub-barrio, menos reconocible).
      expect(resultado?.direccionResuelta).toBe(
        'Calle 27, Comuna 15 - Guayabal, Medellín',
      );
    });

    it('usa city_district cuando la ciudad no expone suburb (ej. Bucaramanga/Cali)', async () => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '7.1',
            lon: '-73.1',
            address: {
              road: 'Calle 10',
              city_district: 'Comuna 13 - Oriental',
              city: 'Perímetro Urbano Bucaramanga',
            },
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('Calle 10', 'Bucaramanga', 'Santander');

      expect(resultado?.direccionResuelta).toBe(
        'Calle 10, Comuna 13 - Oriental, Bucaramanga',
      );
    });

    it('limpia el sufijo " ciudad" del nombre de la ciudad (ej. Bogotá/Cali)', async () => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '4.6',
            lon: '-74.1',
            address: {
              road: 'Carrera 43A',
              suburb: 'Localidad Teusaquillo',
              city: 'Bogotá ciudad',
            },
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('Carrera 43A', 'Bogotá', null);

      expect(resultado?.direccionResuelta).toBe(
        'Carrera 43A, Localidad Teusaquillo, Bogotá',
      );
    });

    it('incluye el nombre del lugar + número + calle antes del barrio/ciudad, para un lugar con nombre', async () => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '6.24',
            lon: '-75.58',
            addresstype: 'amenity',
            address: {
              amenity: 'Universidad Pontificia Bolivariana',
              house_number: '70 - 01',
              road: 'Circular 1',
              suburb: 'Comuna 11 - Laureles-Estadio',
              city: 'Perímetro Urbano Medellín',
            },
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar(
        'Universidad Pontificia Bolivariana',
        'Medellín',
        'Antioquia',
      );

      expect(resultado?.direccionResuelta).toBe(
        'Universidad Pontificia Bolivariana, 70 - 01, Circular 1, Comuna 11 - Laureles-Estadio, Medellín',
      );
    });

    it('cae al recorte de display_name si address no trae ni barrio ni ciudad', async () => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '4.6',
            lon: '-74.1',
            address: { road: 'Calle 80', house_number: '20-15' },
            display_name: 'Calle 80, 20-15, Bogotá, Colombia',
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('Calle 80', 'Bogotá', null);

      expect(resultado?.direccionResuelta).toBe('Calle 80, 20-15, Bogotá');
    });
  });

  it('devuelve null si no hay resultados', async () => {
    fetchMock.mockResolvedValue(respuestaJson([]));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'dirección inventada',
      null,
      null,
    );

    expect(resultado).toBeNull();
  });

  it('devuelve null (no lanza) si Nominatim responde con error HTTP', async () => {
    fetchMock.mockResolvedValue(respuestaJson(null, false, 503));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'Calle 80',
      'Bogotá',
      'Cundinamarca',
    );

    expect(resultado).toBeNull();
  });

  it('devuelve null (no lanza) si falla la conexión', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'Calle 80',
      'Bogotá',
      'Cundinamarca',
    );

    expect(resultado).toBeNull();
  });

  // Ronda 14 — bug real reportado: una dirección que geocodificaba
  // bien consultada directo contra Nominatim, devolvía null pasando
  // por la API — de forma consistente, en varios intentos seguidos.
  // Diagnóstico en vivo: Nominatim (servicio público gratuito)
  // respondió con error/vacío específicamente desde el servidor de la
  // API en ese momento — probablemente por volumen alto de pruebas.
  // Antes, CUALQUIER error de un solo intento se leía como "la
  // dirección no existe"; ahora se reintenta antes de darse por
  // vencido.
  describe('reintentos ante un error/timeout de Nominatim (no ante una respuesta válida sin resultados)', () => {
    it('reintenta si Nominatim responde con error HTTP y encuentra el resultado en el segundo intento', async () => {
      fetchMock
        .mockResolvedValueOnce(respuestaJson(null, false, 503))
        .mockResolvedValueOnce(
          respuestaJson([{ lat: '6.2', lon: '-75.6', address: { road: 'Calle 27' } }]),
        );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('Calle 27', 'Medellín', 'Antioquia');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(resultado).not.toBeNull();
      expect(resultado?.lat).toBe(6.2);
    }, 15000);

    it('reintenta ante una excepción de red y se recupera en un intento posterior', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(
          respuestaJson([{ lat: '6.2', lon: '-75.6', address: { road: 'Calle 27' } }]),
        );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('Calle 27', 'Medellín', 'Antioquia');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(resultado).not.toBeNull();
    }, 15000);

    it('NO reintenta cuando Nominatim responde 200 con 0 resultados — es una respuesta válida, no un error', async () => {
      fetchMock.mockResolvedValue(respuestaJson([]));
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar('dirección inventada', null, null);

      // Solo 1 llamada: ni siquiera hay ciudad/departamento que
      // reintentar sin ellos, y una lista vacía con 200 OK no dispara
      // el reintento por error.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(resultado).toBeNull();
    });
  });

  // Bug real reportado: la dirección aceptaba lugares/instituciones sin
  // punto de entrega preciso (ej. "Universidad de Medellín", un campus
  // completo sin house_number). Todas las respuestas de estos tests
  // (addresstype, house_number, display_name) son las que Nominatim
  // devuelve de verdad, verificadas en vivo antes de escribir esto.
  //
  // Diseño final (dos vueltas de ajuste, ver comentario en el
  // adapter): NO se rechaza el resultado — el lat/lng sigue siendo el
  // mejor dato disponible (ej. el centro real del campus, navegable),
  // solo se marca `precisa: false` para que quien consuma esto pueda
  // avisarle al usuario sin bloquear el envío.
  it.each(['amenity', 'shop', 'tourism', 'leisure', 'office', 'historic', 'building'])(
    'geocodifica igual pero con precisa=false si es un lugar SIN house_number (addresstype="%s") — ej. Universidad de Medellín',
    async (addresstype) => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '6.2310101',
            lon: '-75.6114011',
            addresstype,
            address: {},
            display_name: 'Universidad de Medellín, Calle 30A, Los Alpes, Medellín, Antioquia, Colombia',
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar(
        'Universidad de Medellín',
        'Medellín',
        'Antioquia',
      );

      expect(resultado).toEqual({
        lat: 6.2310101,
        lng: -75.6114011,
        direccionResuelta: 'Universidad de Medellín, Calle 30A, Los Alpes',
        precisa: false,
      });
    },
  );

  // Regresión del sobre-ajuste: "Centro Comercial El Tesoro" y "UPB"
  // son lugares (addresstype shop/amenity) pero Nominatim SÍ les
  // conoce un house_number preciso ("1 Sur - 45", "70 - 01") — son
  // direcciones entregables de verdad, deben quedar precisa=true igual
  // que cualquier otra dirección con número.
  it.each([
    ['shop', '1 Sur - 45', 'Centro Comercial El Tesoro'],
    ['amenity', '70 - 01', 'Universidad Pontificia Bolivariana'],
  ])(
    'precisa=true para un lugar (addresstype="%s") si SÍ trae house_number ("%s") — ej. %s',
    async (addresstype, houseNumber) => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '6.1970205',
            lon: '-75.5591826',
            addresstype,
            address: { house_number: houseNumber },
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar(
        'Centro Comercial El Tesoro',
        'Medellín',
        'Antioquia',
      );

      expect(resultado?.precisa).toBe(true);
      expect(resultado?.lat).toBe(6.1970205);
      expect(resultado?.lng).toBe(-75.5591826);
    },
  );

  it.each(['road', 'residential', 'house', 'suburb'])(
    'precisa=true cuando el addresstype es de calle/dirección ("%s"), aunque falte house_number',
    async (addresstype) => {
      fetchMock.mockResolvedValue(
        respuestaJson([{ lat: '4.6486', lon: '-74.0628', addresstype, address: {} }]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar(
        'Carrera 43A # 18-95',
        'Medellín',
        'Antioquia',
      );

      expect(resultado?.precisa).toBe(true);
    },
  );

  it('precisa=true si la respuesta no trae addresstype ni address (compatibilidad hacia atrás)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([{ lat: '4.6486', lon: '-74.0628' }]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar('Calle 80', 'Bogotá', 'Cundinamarca');

    expect(resultado?.precisa).toBe(true);
  });

  // Ronda 11 — bug real reportado: un Paciente registrado en un
  // municipio (ej. Amagá) puede estar pidiendo desde otro (ej. San
  // Antonio de Prado). Cuando el resultado elegido no es preciso, se
  // ofrecen las demás coincidencias como candidatos alternos.
  it('incluye los demás resultados como candidatos cuando el elegido no es preciso', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([
        {
          lat: '6.0392',
          lon: '-75.6989',
          addresstype: 'amenity',
          address: {},
          display_name: 'Amagá, Antioquia, Colombia',
        },
        {
          lat: '6.1590',
          lon: '-75.6280',
          addresstype: 'suburb',
          address: { house_number: '12-34' },
          display_name: 'San Antonio de Prado, Medellín, Antioquia, Colombia',
        },
      ]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'San Antonio de Prado',
      'Amagá',
      'Antioquia',
    );

    expect(resultado?.precisa).toBe(false);
    expect(resultado?.candidatos).toHaveLength(1);
    expect(resultado?.candidatos?.[0]).toMatchObject({
      lat: 6.159,
      lng: -75.628,
      direccionResuelta: 'San Antonio de Prado, Medellín, Antioquia',
      precisa: true,
    });
  });

  it('no incluye candidatos cuando el resultado elegido ya es preciso (no hace falta ofrecer alternativas)', async () => {
    fetchMock.mockResolvedValue(
      respuestaJson([
        { lat: '6.1590', lon: '-75.6280', addresstype: 'road', address: {} },
        { lat: '6.0392', lon: '-75.6989', addresstype: 'amenity', address: {} },
      ]),
    );
    const adapter = new NominatimGeocodificacionAdapter();

    const resultado = await adapter.geocodificar(
      'Carrera 43A # 18-95',
      'Medellín',
      'Antioquia',
    );

    expect(resultado?.precisa).toBe(true);
    expect(resultado?.candidatos).toBeUndefined();
  });

  // Ronda 11 — bug real reportado: "no se está ubicando ninguna
  // dirección". Causa encontrada en vivo: la ciudad/departamento del
  // PERFIL del Paciente se pega a la búsqueda para acotarla, pero un
  // Paciente registrado en un municipio (ej. Amagá) puede estar
  // pidiendo desde otro (ej. Medellín) — Nominatim, al recibir una
  // calle real pegada a una ciudad donde esa calle no existe, no
  // devuelve una aproximación: devuelve CERO resultados. Sin este
  // reintento, eso era un fallo total sin ninguna sugerencia.
  describe('reintento sin ciudad/departamento cuando la búsqueda acotada no encuentra nada', () => {
    it('si la búsqueda acotada da 0 resultados, reintenta sin ciudad/departamento y ofrece el resultado como candidato (impreciso, sin confirmar)', async () => {
      fetchMock
        .mockResolvedValueOnce(respuestaJson([])) // con ciudad/departamento del perfil
        .mockResolvedValueOnce(
          respuestaJson([
            {
              lat: '6.2093857',
              lon: '-75.5708593',
              addresstype: 'road',
              address: { house_number: '5A-113' },
              display_name: 'Carrera 43A, El Poblado, Medellín, Antioquia, Colombia',
            },
          ]),
        ); // sin ciudad/departamento

      const adapter = new NominatimGeocodificacionAdapter();
      const resultado = await adapter.geocodificar(
        'Carrera 43A #5A-113',
        'Amagá',
        'Antioquia',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [urlAcotada] = fetchMock.mock.calls[0] as [URL];
      const [urlAmplia] = fetchMock.mock.calls[1] as [URL];
      expect(urlAcotada.searchParams.get('q')).toBe(
        'Carrera 43A #5A-113, Amagá, Antioquia, Colombia',
      );
      expect(urlAmplia.searchParams.get('q')).toBe(
        'Carrera 43A #5A-113, Colombia',
      );
      // Nunca "precisa" en este camino — aunque tenga house_number, no
      // se confirmó que esté en la ciudad que el Paciente tiene
      // registrada, así que igual hay que avisarle y dejar que elija.
      expect(resultado?.precisa).toBe(false);
      expect(resultado?.lat).toBe(6.2093857);
      expect(resultado?.direccionResuelta).toBe(
        'Carrera 43A, El Poblado, Medellín',
      );
    });

    it('si ninguna de las dos búsquedas encuentra nada, devuelve null (fallo real, no solo de ciudad)', async () => {
      fetchMock.mockResolvedValue(respuestaJson([]));
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar(
        'dirección que no existe en ningún lado',
        'Amagá',
        'Antioquia',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(resultado).toBeNull();
    });

    it('no reintenta si ya no había ciudad/departamento que quitar (nada más que probar)', async () => {
      fetchMock.mockResolvedValue(respuestaJson([]));
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.geocodificar(
        'dirección inventada',
        null,
        null,
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(resultado).toBeNull();
    });

    it('ofrece los demás resultados de la búsqueda amplia como candidatos', async () => {
      fetchMock
        .mockResolvedValueOnce(respuestaJson([]))
        .mockResolvedValueOnce(
          respuestaJson([
            {
              lat: '6.2093857',
              lon: '-75.5708593',
              addresstype: 'road',
              address: { house_number: '5A-113' },
              display_name: 'Carrera 43A, El Poblado, Medellín, Antioquia, Colombia',
            },
            {
              lat: '6.1590',
              lon: '-75.6280',
              addresstype: 'road',
              address: { house_number: '5A-113' },
              display_name: 'Carrera 43A, San Antonio de Prado, Medellín, Antioquia, Colombia',
            },
          ]),
        );

      const adapter = new NominatimGeocodificacionAdapter();
      const resultado = await adapter.geocodificar(
        'Carrera 43A #5A-113',
        'Amagá',
        'Antioquia',
      );

      expect(resultado?.candidatos).toHaveLength(1);
      expect(resultado?.candidatos?.[0].direccionResuelta).toBe(
        'Carrera 43A, San Antonio de Prado, Medellín',
      );
    });
  });

  // Ronda 13 — sugerencias mientras se escribe (ej. "universidad de
  // medellin"), no solo al confirmar la dirección completa.
  describe('autocompletar', () => {
    it('devuelve TODAS las coincidencias como candidatos, sin elegir una', async () => {
      fetchMock.mockResolvedValue(
        respuestaJson([
          {
            lat: '6.2419444',
            lon: '-75.5895294',
            addresstype: 'amenity',
            address: { amenity: 'Universidad de Medellín' },
            display_name: 'Universidad de Medellín, Medellín, Antioquia, Colombia',
          },
          {
            lat: '6.2',
            lon: '-75.6',
            addresstype: 'amenity',
            address: { amenity: 'Universidad Nacional de Medellín' },
            display_name: 'Universidad Nacional de Medellín, Medellín, Antioquia, Colombia',
          },
        ]),
      );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.autocompletar(
        'universidad de medellin',
        'Medellín',
        'Antioquia',
      );

      expect(resultado).toHaveLength(2);
      expect(resultado[0].direccionResuelta).toBe('Universidad de Medellín, Medellín, Antioquia');
      expect(resultado[1].direccionResuelta).toBe(
        'Universidad Nacional de Medellín, Medellín, Antioquia',
      );
    });

    it('reintenta sin ciudad/departamento si la búsqueda acotada no encuentra nada', async () => {
      fetchMock
        .mockResolvedValueOnce(respuestaJson([]))
        .mockResolvedValueOnce(
          respuestaJson([
            { lat: '6.2', lon: '-75.6', address: { road: 'Calle 27' } },
          ]),
        );
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.autocompletar('Calle 27', 'Amagá', 'Antioquia');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [urlAmplia] = fetchMock.mock.calls[1] as [URL];
      expect(urlAmplia.searchParams.get('q')).toBe('Calle 27, Colombia');
      expect(resultado).toHaveLength(1);
    });

    it('devuelve una lista vacía (no null) si no hay coincidencias', async () => {
      fetchMock.mockResolvedValue(respuestaJson([]));
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.autocompletar('dirección inventada', null, null);

      expect(resultado).toEqual([]);
    });

    it('devuelve una lista vacía (no lanza) si Nominatim falla', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));
      const adapter = new NominatimGeocodificacionAdapter();

      const resultado = await adapter.autocompletar('Calle 27', null, null);

      expect(resultado).toEqual([]);
    });
  });
});
