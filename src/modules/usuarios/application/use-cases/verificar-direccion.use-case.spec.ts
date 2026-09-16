import { GeocodificacionPort } from '../../../solicitudes/domain/ports/geocodificacion.port';
import { VerificarDireccionUseCase } from './verificar-direccion.use-case';

describe('VerificarDireccionUseCase', () => {
  const geocodificacion: GeocodificacionPort = {
    geocodificar: jest.fn(),
    autocompletar: jest.fn(),
  };
  const useCase = new VerificarDireccionUseCase(geocodificacion);

  beforeEach(() => jest.resetAllMocks());

  it('devuelve direccionResuelta/precisa/candidatos cuando Nominatim encuentra algo', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue({
      lat: 6.2,
      lng: -75.6,
      direccionResuelta: 'Carrera 43A, El Poblado',
      precisa: false,
      candidatos: [
        { lat: 6.1, lng: -75.5, direccionResuelta: 'otra calle', precisa: true },
      ],
    });

    const resultado = await useCase.execute({
      direccion: 'Carrera 43A #5A-113',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });

    expect(resultado).toEqual({
      direccionResuelta: 'Carrera 43A, El Poblado',
      precisa: false,
      candidatos: [
        { lat: 6.1, lng: -75.5, direccionResuelta: 'otra calle', precisa: true },
      ],
    });
    expect(geocodificacion.geocodificar).toHaveBeenCalledWith(
      'Carrera 43A #5A-113',
      'Medellín',
      'Antioquia',
    );
  });

  it('devuelve direccionResuelta null y precisa true si Nominatim no encuentra nada (no hay nada que "corregir")', async () => {
    (geocodificacion.geocodificar as jest.Mock).mockResolvedValue(null);

    const resultado = await useCase.execute({
      direccion: 'dirección inventada',
      ciudad: null,
      departamento: null,
    });

    expect(resultado).toEqual({
      direccionResuelta: null,
      precisa: true,
      candidatos: [],
    });
  });
});
