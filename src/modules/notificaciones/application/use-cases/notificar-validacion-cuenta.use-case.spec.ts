import { NotificarValidacionCuentaUseCase } from './notificar-validacion-cuenta.use-case';
import { RegistrarNotificacionUseCase } from './registrar-notificacion.use-case';

describe('NotificarValidacionCuentaUseCase (MED-110)', () => {
  const registrar = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as RegistrarNotificacionUseCase;
  const useCase = new NotificarValidacionCuentaUseCase(registrar);

  beforeEach(() => {
    jest.resetAllMocks();
    (registrar.execute as jest.Mock).mockResolvedValue(undefined);
  });

  it('3. el domiciliario recibe la aprobación de la cuenta', async () => {
    await useCase.execute('dom-1', 'aprobada');

    expect(registrar.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        destinatarioId: 'dom-1',
        tipo: 'validacion_cuenta',
        titulo: 'Cuenta aprobada',
        referenciaTipo: 'cuenta',
        referenciaId: 'dom-1',
      }),
    );
    const mensaje = (registrar.execute as jest.Mock).mock.calls[0][0].mensaje as string;
    expect(mensaje).toContain('Ya puedes comenzar a recibir pedidos');
    expect(mensaje.toLowerCase()).not.toContain('cédula');
  });

  it('el rechazo no incluye el motivo interno', async () => {
    await useCase.execute('dom-1', 'rechazada');
    const mensaje = (registrar.execute as jest.Mock).mock.calls[0][0].mensaje as string;
    expect(mensaje).toBe('Tu solicitud de registro no fue aprobada.');
  });
});
