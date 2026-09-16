import { GeocodificacionPort } from '../../../solicitudes/domain/ports/geocodificacion.port';
import { AutocompletarDireccionUseCase } from './autocompletar-direccion.use-case';

describe('AutocompletarDireccionUseCase', () => {
  const geocodificacion: GeocodificacionPort = {
    geocodificar: jest.fn(),
    autocompletar: jest.fn(),
  };
  const useCase = new AutocompletarDireccionUseCase(geocodificacion);

  beforeEach(() => jest.resetAllMocks());

  it('delega texto, ciudad y departamento en el puerto de geocodificación', async () => {
    (geocodificacion.autocompletar as jest.Mock).mockResolvedValue([]);

    await useCase.execute({
      texto: 'universidad de medellin',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });

    expect(geocodificacion.autocompletar).toHaveBeenCalledWith(
      'universidad de medellin',
      'Medellín',
      'Antioquia',
    );
  });

  it('devuelve la lista de candidatos tal cual la resuelve el puerto', async () => {
    const candidatos = [
      { lat: 6.2, lng: -75.5, direccionResuelta: 'Universidad de Medellín, Medellín', precisa: false },
    ];
    (geocodificacion.autocompletar as jest.Mock).mockResolvedValue(candidatos);

    const resultado = await useCase.execute({
      texto: 'universidad de medellin',
      ciudad: null,
      departamento: null,
    });

    expect(resultado).toBe(candidatos);
  });
});
