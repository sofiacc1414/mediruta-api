import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('GET /auth/me usa solo la identidad autenticada', async () => {
    const obtenerSesionActual = {
      execute: jest.fn().mockResolvedValue({
        usuario: {
          id: 'usuario-uuid',
          correo: 'persona@mail.com',
          estadoCuenta: 'activa',
          roles: [],
        },
      }),
    };

    const controller = new AuthController(
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      obtenerSesionActual as unknown as ObtenerSesionActualUseCase,
    );

    const resultado = await controller.me({
      usuarioId: 'usuario-desde-guard',
      sid: 'sid-desde-guard',
    });

    expect(obtenerSesionActual.execute).toHaveBeenCalledWith(
      'usuario-desde-guard',
    );
    expect(obtenerSesionActual.execute).not.toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: expect.anything() }),
    );
    expect(resultado.usuario.id).toBe('usuario-uuid');
  });
});
