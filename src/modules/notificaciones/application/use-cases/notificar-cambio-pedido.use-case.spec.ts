import { NotificacionRepositoryPort } from '../../domain/ports/notificacion.repository.port';
import { NotificarCambioPedidoUseCase } from './notificar-cambio-pedido.use-case';
import { RegistrarNotificacionUseCase } from './registrar-notificacion.use-case';

describe('NotificarCambioPedidoUseCase (MED-110)', () => {
  const notificaciones: NotificacionRepositoryPort = {
    guardar: jest.fn(),
    listar: jest.fn(),
    marcarLeida: jest.fn(),
    datosPedido: jest.fn(),
    tokensPush: jest.fn(),
    registrarDispositivo: jest.fn(),
  };
  const registrar = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as RegistrarNotificacionUseCase;
  const useCase = new NotificarCambioPedidoUseCase(notificaciones, registrar);

  beforeEach(() => {
    jest.resetAllMocks();
    (registrar.execute as jest.Mock).mockResolvedValue(undefined);
  });

  it('1. el paciente recibe el cambio de estado', async () => {
    (notificaciones.datosPedido as jest.Mock).mockResolvedValue({
      pacienteId: 'pac-1',
      domiciliarioId: null,
      estado: 'en_camino_entrega',
      codigoPedido: 'MR-10',
    });

    await useCase.execute('sol-1');

    expect(registrar.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'pac-1',
        tipo: 'cambio_estado',
        titulo: 'Pedido en camino',
        referenciaId: 'sol-1',
        claveEvento: 'sol-1:en_camino_entrega',
      }),
    );
    const mensaje = (registrar.execute as jest.Mock).mock.calls[0][0].mensaje as string;
    expect(mensaje).toBe('Tu pedido está en camino.');
    expect(mensaje.toLowerCase()).not.toContain('medicamento');
  });

  it('2. el domiciliario recibe la asignación y el paciente el estado', async () => {
    (notificaciones.datosPedido as jest.Mock).mockResolvedValue({
      pacienteId: 'pac-1',
      domiciliarioId: 'dom-1',
      estado: 'asignado_en_camino_farmacia',
      codigoPedido: 'MR-11',
    });

    await useCase.execute('sol-2');

    expect(registrar.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'dom-1',
        tipo: 'asignacion',
        titulo: 'Nuevo pedido asignado',
        mensaje: 'Tienes un nuevo pedido disponible para gestionar.',
        referenciaId: 'sol-2',
      }),
    );
    expect(registrar.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'pac-1',
        tipo: 'cambio_estado',
      }),
    );
  });

  it('5. un estado que no es relevante no genera aviso', async () => {
    (notificaciones.datosPedido as jest.Mock).mockResolvedValue({
      pacienteId: 'pac-1',
      domiciliarioId: null,
      estado: 'borrador',
      codigoPedido: null,
    });

    await useCase.execute('sol-3');

    expect(registrar.execute).not.toHaveBeenCalled();
  });
});
