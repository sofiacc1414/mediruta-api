import { GeocodificacionPort } from '../../domain/ports/geocodificacion.port';
import {
  ParametrosEstimacionPrecio,
  SolicitudRepositoryPort,
} from '../../domain/ports/solicitud.repository.port';
import { AutocompletarDireccionUseCase } from './autocompletar-direccion.use-case';

describe('AutocompletarDireccionUseCase', () => {
  const solicitudes: Pick<SolicitudRepositoryPort, 'obtenerParametrosEstimacionPrecio'> = {
    obtenerParametrosEstimacionPrecio: jest.fn(),
  };
  const geocodificacion: GeocodificacionPort = {
    geocodificar: jest.fn(),
    autocompletar: jest.fn(),
  };
  const useCase = new AutocompletarDireccionUseCase(
    solicitudes as SolicitudRepositoryPort,
    geocodificacion,
  );

  beforeEach(() => jest.resetAllMocks());

  const parametros: ParametrosEstimacionPrecio = {
    copago: 15000,
    ciudad: 'medellin',
    departamento: 'antioquia',
    tarifaBaseDomicilio: 20000,
    tarifaPorKm: 1200,
    tarifaPorMinuto: 200,
    tiempoBaseFarmaciaMin: 10,
    velocidadPromedioKmh: 20,
    distanciaIncluidaKm: 15,
    tarifaPorKmExcedente: 2400,
  };

  it('geocodifica con la ciudad/departamento del perfil del Paciente', async () => {
    (solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock).mockResolvedValue(parametros);
    (geocodificacion.autocompletar as jest.Mock).mockResolvedValue([]);

    await useCase.execute({ pacienteId: 'paciente-uuid', texto: 'universidad de medellin' });

    expect(geocodificacion.autocompletar).toHaveBeenCalledWith(
      'universidad de medellin',
      'medellin',
      'antioquia',
    );
  });

  it('geocodifica sin ciudad/departamento si el Paciente no tiene perfil (nunca debería pasar, pero no explota)', async () => {
    (solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock).mockResolvedValue(null);
    (geocodificacion.autocompletar as jest.Mock).mockResolvedValue([]);

    await useCase.execute({ pacienteId: 'paciente-uuid', texto: 'calle 27' });

    expect(geocodificacion.autocompletar).toHaveBeenCalledWith('calle 27', null, null);
  });

  it('devuelve la lista de candidatos tal cual la resuelve el puerto', async () => {
    (solicitudes.obtenerParametrosEstimacionPrecio as jest.Mock).mockResolvedValue(parametros);
    const candidatos = [
      { lat: 6.2, lng: -75.5, direccionResuelta: 'Universidad de Medellín, Medellín', precisa: false },
    ];
    (geocodificacion.autocompletar as jest.Mock).mockResolvedValue(candidatos);

    const resultado = await useCase.execute({
      pacienteId: 'paciente-uuid',
      texto: 'universidad de medellin',
    });

    expect(resultado).toBe(candidatos);
  });
});
