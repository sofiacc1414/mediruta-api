import { FueraDeUbicacionAutorizadaError } from '../../domain/errors/fuera-de-ubicacion-autorizada.error';
import { DocumentosPacienteNoDisponiblesError } from '../../domain/errors/documentos-paciente-no-disponibles.error';
import { MENSAJE_FUERA_DE_UBICACION } from '../../domain/geocerca-acceso';
import { AccesoTemporalRepositoryPort } from '../../domain/ports/acceso-temporal.repository.port';
import { AlmacenamientoArchivosPort } from '../../../usuarios/domain/ports/almacenamiento-archivos.port';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import { ObtenerDocumentosPacienteParaRecogerUseCase } from './obtener-documentos-paciente-para-recoger.use-case';

describe('HU-16 acceso temporal a documentos (MED-144)', () => {
  const solicitudes = {
    obtenerDocumentosPacienteParaRecoger: jest.fn(),
  } as unknown as SolicitudRepositoryPort;
  const almacenamiento: AlmacenamientoArchivosPort = {
    subir: jest.fn(),
    obtenerUrlFirmada: jest.fn().mockResolvedValue('https://firmada.test/doc'),
  };
  const accesos: AccesoTemporalRepositoryPort = {
    puntoFarmacia: jest.fn(),
    registrar: jest.fn().mockResolvedValue(undefined),
    revocarPorPedido: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new ObtenerDocumentosPacienteParaRecogerUseCase(
    solicitudes,
    almacenamiento,
    accesos,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (accesos.registrar as jest.Mock).mockResolvedValue(undefined);
    (accesos.revocarPorPedido as jest.Mock).mockResolvedValue(undefined);
  });

  it('1. en la farmacia y en la etapa correcta devuelve solo las URLs', async () => {
    (accesos.puntoFarmacia as jest.Mock).mockResolvedValue({
      estado: 'en_farmacia',
      farmaciaLat: 6.25,
      farmaciaLng: -75.56,
    });
    (solicitudes.obtenerDocumentosPacienteParaRecoger as jest.Mock).mockResolvedValue({
      cedulaFrentePath: 'c1',
      cedulaReversoPath: 'c2',
      recetaPath: 'r1',
    });

    const resultado = await useCase.execute('dom', 'sol', 6.25, -75.56);

    expect(resultado).toEqual({
      cedulaFrenteUrl: 'https://firmada.test/doc',
      cedulaReversoUrl: 'https://firmada.test/doc',
      recetaUrl: 'https://firmada.test/doc',
    });
    expect(accesos.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'permitido', domiciliarioId: 'dom' }),
    );
  });

  it('2. fuera de la zona bloquea y deja el intento como rechazado', async () => {
    (accesos.puntoFarmacia as jest.Mock).mockResolvedValue({
      estado: 'en_farmacia',
      farmaciaLat: 6.25,
      farmaciaLng: -75.56,
    });

    await expect(useCase.execute('dom', 'sol', 6.3, -75.56)).rejects.toBeInstanceOf(
      FueraDeUbicacionAutorizadaError,
    );
    await expect(useCase.execute('dom', 'sol', 6.3, -75.56)).rejects.toThrow(
      MENSAJE_FUERA_DE_UBICACION,
    );
    expect(solicitudes.obtenerDocumentosPacienteParaRecoger).not.toHaveBeenCalled();
    expect(accesos.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'rechazado' }),
    );
    expect(accesos.revocarPorPedido).toHaveBeenCalledWith('sol');
  });

  it('4. un cambio de etapa revoca el acceso y no devuelve documentos', async () => {
    (accesos.puntoFarmacia as jest.Mock).mockResolvedValue({
      estado: 'medicamentos_recogidos',
      farmaciaLat: 6.25,
      farmaciaLng: -75.56,
    });

    await expect(useCase.execute('dom', 'sol', 6.25, -75.56)).rejects.toBeInstanceOf(
      DocumentosPacienteNoDisponiblesError,
    );
    expect(accesos.revocarPorPedido).toHaveBeenCalledWith('sol');
    expect(accesos.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'rechazado', solicitudId: 'sol' }),
    );
  });

  it('5. un pedido que no es del domiciliario también queda auditado', async () => {
    (accesos.puntoFarmacia as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('dom', 'ajeno', 6.25, -75.56)).rejects.toBeInstanceOf(
      DocumentosPacienteNoDisponiblesError,
    );
    expect(accesos.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        resultado: 'rechazado',
        solicitudId: 'ajeno',
        domiciliarioId: 'dom',
      }),
    );
  });
});
