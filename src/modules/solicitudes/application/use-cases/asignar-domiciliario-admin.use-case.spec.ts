import { RolNoAutorizadoError } from '../../../usuarios/domain/errors/rol-no-autorizado.error';
import { DomiciliarioNoDisponibleParaAsignarError } from '../../domain/errors/domiciliario-no-disponible-para-asignar.error';
import { PedidoYaAsignadoError } from '../../domain/errors/pedido-ya-asignado.error';
import { SolicitudNoEncontradaError } from '../../domain/errors/solicitud-no-encontrada.error';
import { SolicitudRepositoryPort } from '../../domain/ports/solicitud.repository.port';
import {
  AsignarDomiciliarioAdminUseCase,
  MENSAJE_DOMICILIARIO_ASIGNADO,
} from './asignar-domiciliario-admin.use-case';

describe('AsignarDomiciliarioAdminUseCase', () => {
  const solicitudes: SolicitudRepositoryPort = {
    crear: jest.fn(),
    listar: jest.fn(),
    obtener: jest.fn(),
    listarMedicamentos: jest.fn(),
    listarHistorial: jest.fn(),
    actualizar: jest.fn(),
    actualizarReceta: jest.fn(),
    enviar: jest.fn(),
    cancelar: jest.fn(),
    obtenerDatosGeocodificacionFarmacia: jest.fn(),
    obtenerNovedadAbierta: jest.fn(),
    listarPedidosDisponibles: jest.fn(),
    aceptarPedido: jest.fn(),
    marcarMedicamentosRecogidos: jest.fn(),
    iniciarEntrega: jest.fn(),
    marcarEnSitio: jest.fn(),
    entregarPedido: jest.fn(),
    reportarNovedad: jest.fn(),
    listarNovedadesAbiertas: jest.fn(),
    resolverNovedad: jest.fn(),
    obtenerPedidoActivo: jest.fn(),
    listarHistorialPedidos: jest.fn(),
    listarHistorialPedidoActivo: jest.fn(),
    obtenerNovedadPropiaAbierta: jest.fn(),
    obtenerDocumentosPacienteParaRecoger: jest.fn(),
    listarPedidosAdmin: jest.fn(),
    obtenerPedidoAdmin: jest.fn(),
    listarMedicamentosPedidoAdmin: jest.fn(),
    listarHistorialPedidoAdmin: jest.fn(),
    obtenerNovedadAbiertaPedidoAdmin: jest.fn(),
    reportarNovedadPaciente: jest.fn(),
    listarDomiciliariosCercanosAdmin: jest.fn(),
    asignarDomiciliarioAdmin: jest.fn(),
    obtenerConfiguracionAdmin: jest.fn(),
    actualizarConfiguracionAdmin: jest.fn(),
  };
  const useCase = new AsignarDomiciliarioAdminUseCase(solicitudes);

  beforeEach(() => jest.resetAllMocks());

  it('asigna y devuelve el mensaje de éxito', async () => {
    (solicitudes.asignarDomiciliarioAdmin as jest.Mock).mockResolvedValue(
      'asignado',
    );

    const resultado = await useCase.execute(
      'admin-uuid',
      'solicitud-uuid',
      'domiciliario-uuid',
    );

    expect(resultado).toEqual({ message: MENSAJE_DOMICILIARIO_ASIGNADO });
    expect(solicitudes.asignarDomiciliarioAdmin).toHaveBeenCalledWith(
      'admin-uuid',
      'solicitud-uuid',
      'domiciliario-uuid',
    );
  });

  it('lanza PedidoYaAsignadoError si otro domiciliario lo tomó primero', async () => {
    (solicitudes.asignarDomiciliarioAdmin as jest.Mock).mockResolvedValue(
      'ya_asignado',
    );

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(PedidoYaAsignadoError);
  });

  it('lanza SolicitudNoEncontradaError si el pedido no existe', async () => {
    (solicitudes.asignarDomiciliarioAdmin as jest.Mock).mockResolvedValue(
      'no_encontrado',
    );

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(SolicitudNoEncontradaError);
  });

  it('lanza RolNoAutorizadoError si el admin no tiene el rol', async () => {
    (solicitudes.asignarDomiciliarioAdmin as jest.Mock).mockResolvedValue(
      'no_autorizado',
    );

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('lanza DomiciliarioNoDisponibleParaAsignarError si el domiciliario ya no está disponible', async () => {
    (solicitudes.asignarDomiciliarioAdmin as jest.Mock).mockResolvedValue(
      'domiciliario_no_disponible',
    );

    await expect(
      useCase.execute('admin-uuid', 'solicitud-uuid', 'domiciliario-uuid'),
    ).rejects.toBeInstanceOf(DomiciliarioNoDisponibleParaAsignarError);
  });
});
