import { FarmaciaAliadaRepositoryPort } from '../../domain/ports/farmacia-aliada.repository.port';
import { IntencionMatcherPort } from '../../domain/ports/intencion-matcher.port';
import {
  MENSAJE_NO_ENTENDIDO,
  MENSAJE_SOPORTE_HUMANO,
  RESPUESTAS_ESTATICAS,
} from '../../domain/respuestas-estaticas';
import { ProcesarMensajeChatbotUseCase } from './procesar-mensaje-chatbot.use-case';

function matcherQueDevuelve(intencion: string, score: number): IntencionMatcherPort {
  return { clasificar: jest.fn().mockReturnValue({ intencion, score }) };
}

describe('ProcesarMensajeChatbotUseCase', () => {
  const farmacias = {
    listarPorEps: jest.fn(),
  } as unknown as FarmaciaAliadaRepositoryPort;

  beforeEach(() => jest.clearAllMocks());

  it('CA3: score por debajo del umbral responde "desconocido" sin consultar nada más', async () => {
    const matcher = matcherQueDevuelve('copago_eps', 0.5);
    const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

    const resultado = await useCase.execute({ usuarioId: 'u1', mensaje: 'algo raro' });

    expect(resultado).toEqual({
      intencion: 'desconocido',
      score: 0.5,
      respuesta: MENSAJE_NO_ENTENDIDO,
      requiereDatos: null,
      ofrecerSoporte: false,
    });
    expect(farmacias.listarPorEps).not.toHaveBeenCalled();
  });

  it('CA3: 2do fallo seguido ofrece soporte humano en vez de repetir "no entendí"', async () => {
    const matcher = matcherQueDevuelve('copago_eps', 0.5);
    const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

    const resultado = await useCase.execute({
      usuarioId: 'u1',
      mensaje: 'algo raro de nuevo',
      intentosSinExitoSeguidos: 1,
    });

    expect(resultado.respuesta).toBe(MENSAJE_SOPORTE_HUMANO);
    expect(resultado.ofrecerSoporte).toBe(true);
  });

  it('funciona sin sesión (usuarioId null) para intenciones que no la necesitan', async () => {
    const matcher = matcherQueDevuelve('registro_cuenta', 0.9);
    const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

    const resultado = await useCase.execute({ usuarioId: null, mensaje: 'como me registro' });

    expect(resultado.respuesta).toBe(RESPUESTAS_ESTATICAS.registro_cuenta);
  });

  it.each([
    'registro_cuenta',
    'cambio_contrasena',
    'baja_cuenta',
    'cobros_tarifas',
    'cancelacion_costo',
    'pedir_medicamentos',
    'chat_domiciliario',
    'reclamo_farmacia',
    'pos_no_pos',
    'novedad_pedido',
    'codigo_entrega',
  ] as const)(
    'responde la FAQ estática para %s',
    async (intencion) => {
      const matcher = matcherQueDevuelve(intencion, 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({ usuarioId: 'u1', mensaje: 'x' });

      expect(resultado.respuesta).toBe(RESPUESTAS_ESTATICAS[intencion]);
      expect(resultado.requiereDatos).toBeNull();
    },
  );

  describe('copago_eps', () => {
    it('pide régimen/rango de ingresos si faltan', async () => {
      const matcher = matcherQueDevuelve('copago_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({ usuarioId: 'u1', mensaje: 'cuanto es el copago' });

      expect(resultado.requiereDatos).toBe('datos_copago');
    });

    it('subsidiado no necesita rango de ingresos', async () => {
      const matcher = matcherQueDevuelve('copago_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({
        usuarioId: 'u1',
        mensaje: 'cuanto es el copago',
        regimen: 'subsidiado',
      });

      expect(resultado.requiereDatos).toBeNull();
      expect(resultado.respuesta).toMatch(/subsidiado/i);
    });

    it('contributivo con rango de ingresos responde el valor calculado', async () => {
      const matcher = matcherQueDevuelve('copago_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({
        usuarioId: 'u1',
        mensaje: 'cuanto es el copago',
        regimen: 'contributivo',
        rangoIngresos: 'menos_2_smlv',
      });

      expect(resultado.requiereDatos).toBeNull();
      expect(resultado.respuesta).toContain('4.700');
    });
  });

  describe('farmacias_eps', () => {
    it('sin sesión, pide iniciar sesión en vez de consultar el catálogo', async () => {
      const matcher = matcherQueDevuelve('farmacias_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({ usuarioId: null, mensaje: 'farmacias de mi eps' });

      expect(resultado.respuesta).toContain('iniciar sesión');
      expect(farmacias.listarPorEps).not.toHaveBeenCalled();
    });

    it('pide la EPS si no vino en la entrada', async () => {
      const matcher = matcherQueDevuelve('farmacias_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({ usuarioId: 'u1', mensaje: 'farmacias de mi eps' });

      expect(resultado.requiereDatos).toBe('eps');
      expect(farmacias.listarPorEps).not.toHaveBeenCalled();
    });

    it('sin resultados para la EPS, lo dice explícitamente', async () => {
      (farmacias.listarPorEps as jest.Mock).mockResolvedValue([]);
      const matcher = matcherQueDevuelve('farmacias_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({
        usuarioId: 'u1',
        mensaje: 'farmacias de mi eps',
        eps: 'EPS Inexistente',
      });

      expect(resultado.respuesta).toContain('No tengo farmacias registradas');
    });

    it('con resultados, los lista', async () => {
      (farmacias.listarPorEps as jest.Mock).mockResolvedValue([
        {
          id: '1',
          eps: 'Sura',
          nombreFarmacia: 'Droguerías Sura',
          ciudad: 'Medellín',
          departamento: 'Antioquia',
          direccion: 'Calle 1',
          telefono: null,
        },
      ]);
      const matcher = matcherQueDevuelve('farmacias_eps', 0.9);
      const useCase = new ProcesarMensajeChatbotUseCase(matcher, farmacias);

      const resultado = await useCase.execute({
        usuarioId: 'u1',
        mensaje: 'farmacias de mi eps',
        eps: 'Sura',
      });

      expect(farmacias.listarPorEps).toHaveBeenCalledWith('u1', 'Sura');
      expect(resultado.respuesta).toContain('Droguerías Sura');
      expect(resultado.respuesta).toContain('Medellín');
    });
  });
});
