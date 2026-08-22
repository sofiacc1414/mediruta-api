import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { CerrarSesionUseCase } from '../../application/use-cases/cerrar-sesion.use-case';
import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import {
  MENSAJE_CONTRASENA_RESTABLECIDA,
  RestablecerContrasenaUseCase,
} from '../../application/use-cases/restablecer-contrasena.use-case';
import {
  MENSAJE_RECUPERACION_SOLICITADA,
  SolicitarRecuperacionContrasenaUseCase,
} from '../../application/use-cases/solicitar-recuperacion-contrasena.use-case';
import { RecuperacionInvalidaError } from '../../domain/errors/recuperacion-invalida.error';
import { AuthController } from './auth.controller';

function crearController(overrides?: {
  obtenerSesionActual?: { execute: jest.Mock };
  cerrarSesion?: { execute: jest.Mock };
  solicitarRecuperacion?: { execute: jest.Mock };
  restablecerContrasena?: { execute: jest.Mock };
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
    (overrides?.solicitarRecuperacion ?? {
      execute: jest.fn(),
    }) as unknown as SolicitarRecuperacionContrasenaUseCase,
    (overrides?.restablecerContrasena ?? {
      execute: jest.fn(),
    }) as unknown as RestablecerContrasenaUseCase,
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

  it('POST /auth/recuperar-contrasena responde siempre el mensaje genérico', async () => {
    const solicitarRecuperacion = {
      execute: jest.fn().mockResolvedValue({
        message: MENSAJE_RECUPERACION_SOLICITADA,
      }),
    };
    const controller = crearController({ solicitarRecuperacion });

    await expect(
      controller.recuperarContrasena({ correo: 'persona@mail.com' }),
    ).resolves.toEqual({
      message: MENSAJE_RECUPERACION_SOLICITADA,
    });
    expect(solicitarRecuperacion.execute).toHaveBeenCalledWith({
      correo: 'persona@mail.com',
    });
    expect(Reflect.getMetadata(
      HTTP_CODE_METADATA,
      AuthController.prototype.recuperarContrasena,
    )).toBe(HttpStatus.OK);
  });

  it('POST /auth/restablecer-contrasena responde el mensaje de éxito', async () => {
    const restablecerContrasena = {
      execute: jest.fn().mockResolvedValue({
        message: MENSAJE_CONTRASENA_RESTABLECIDA,
      }),
    };
    const controller = crearController({ restablecerContrasena });

    await expect(
      controller.restablecer({
        correo: 'persona@mail.com',
        codigo: '000123',
        nuevaPassword: 'ClaveNueva1!',
      }),
    ).resolves.toEqual({
      message: MENSAJE_CONTRASENA_RESTABLECIDA,
    });
    expect(restablecerContrasena.execute).toHaveBeenCalledWith({
      correo: 'persona@mail.com',
      codigo: '000123',
      nuevaPassword: 'ClaveNueva1!',
    });
    expect(Reflect.getMetadata(
      HTTP_CODE_METADATA,
      AuthController.prototype.restablecer,
    )).toBe(HttpStatus.OK);
  });

  it('POST /auth/restablecer-contrasena propaga el error genérico de dominio', async () => {
    const restablecerContrasena = {
      execute: jest.fn().mockRejectedValue(new RecuperacionInvalidaError()),
    };
    const controller = crearController({ restablecerContrasena });

    await expect(
      controller.restablecer({
        correo: 'persona@mail.com',
        codigo: '000123',
        nuevaPassword: 'ClaveNueva1!',
      }),
    ).rejects.toBeInstanceOf(RecuperacionInvalidaError);
  });
});
