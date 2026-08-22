import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { CerrarSesionUseCase } from '../../application/use-cases/cerrar-sesion.use-case';
import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import { AuthController } from './auth.controller';

function crearController(overrides?: {
  obtenerSesionActual?: { execute: jest.Mock };
  cerrarSesion?: { execute: jest.Mock };
}) {
  return new AuthController(
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { execute: jest.fn() } as never,
    (overrides?.obtenerSesionActual ?? {
      execute: jest.fn(),
    }) as unknown as ObtenerSesionActualUseCase,
    (overrides?.cerrarSesion ?? {
      execute: jest.fn(),
    }) as unknown as CerrarSesionUseCase,
  );
}

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
    const controller = crearController({ obtenerSesionActual });

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

  it('POST /auth/logout usa la identidad autenticada y responde 204', async () => {
    const cerrarSesion = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = crearController({ cerrarSesion });

    await expect(
      controller.logout({
        usuarioId: 'usuario-desde-guard',
        sid: 'sid-desde-guard',
      }),
    ).resolves.toBeUndefined();

    expect(cerrarSesion.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      sid: 'sid-desde-guard',
    });
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.logout)).toBe(
      HttpStatus.NO_CONTENT,
    );
  });
});
