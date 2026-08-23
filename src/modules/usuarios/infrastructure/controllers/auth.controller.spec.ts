import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import {
  CambiarContrasenaUseCase,
  MENSAJE_CONTRASENA_CAMBIADA,
} from '../../application/use-cases/cambiar-contrasena.use-case';
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
import { AccessAuthGuard } from '../guards/access-auth.guard';
import { REFRESH_COOKIE_NAME } from '../auth/refresh-cookie';
import { IniciarSesionUseCase } from '../../application/use-cases/iniciar-sesion.use-case';
import { RefrescarSesionUseCase } from '../../application/use-cases/refrescar-sesion.use-case';
import { RegistrarUsuarioUseCase } from '../../application/use-cases/registrar-usuario.use-case';

function crearController(overrides?: {
  iniciarSesion?: { execute: jest.Mock };
  refrescarSesion?: { execute: jest.Mock };
  obtenerSesionActual?: { execute: jest.Mock };
  cerrarSesion?: { execute: jest.Mock };
  solicitarRecuperacion?: { execute: jest.Mock };
  restablecerContrasena?: { execute: jest.Mock };
  cambiarContrasena?: { execute: jest.Mock };
}) {
  return new AuthController(
    { execute: jest.fn() } as unknown as RegistrarUsuarioUseCase,
    (overrides?.iniciarSesion ?? {
      execute: jest.fn(),
    }) as unknown as IniciarSesionUseCase,
    (overrides?.refrescarSesion ?? {
      execute: jest.fn(),
    }) as unknown as RefrescarSesionUseCase,
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
    (overrides?.cambiarContrasena ?? {
      execute: jest.fn(),
    }) as unknown as CambiarContrasenaUseCase,
  );
}

function crearRequest(overrides?: { cookies?: Record<string, string> }): never {
  return {
    headers: { 'user-agent': 'jest-test-agent' },
    ip: '127.0.0.1',
    cookies: overrides?.cookies ?? {},
  } as never;
}

function crearResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
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

  it('POST /auth/logout usa la identidad autenticada, limpia la cookie y responde 204', async () => {
    const cerrarSesion = { execute: jest.fn().mockResolvedValue(undefined) };
    const controller = crearController({ cerrarSesion });
    const res = crearResponse();

    await expect(
      controller.logout(
        { usuarioId: 'usuario-desde-guard', sid: 'sid-desde-guard' },
        res as never,
      ),
    ).resolves.toBeUndefined();

    expect(cerrarSesion.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      sid: 'sid-desde-guard',
    });
    expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
      path: '/auth',
    });
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.logout),
    ).toBe(HttpStatus.NO_CONTENT);
  });

  describe('POST /auth/login', () => {
    const credenciales = {
      correo: 'persona@mail.com',
      password: 'ClaveActual1!',
    };
    const resultadoUseCase = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      usuario: {
        id: 'usuario-uuid',
        correo: 'persona@mail.com',
        estadoCuenta: 'activa' as const,
        roles: [],
      },
    };

    it('sin X-Client-Type responde el refreshToken en el body y no setea cookie (flujo App)', async () => {
      const iniciarSesion = {
        execute: jest.fn().mockResolvedValue(resultadoUseCase),
      };
      const controller = crearController({ iniciarSesion });
      const res = crearResponse();

      const resultado = await controller.login(
        credenciales,
        crearRequest(),
        res as never,
        undefined,
      );

      expect(resultado).toEqual(resultadoUseCase);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('con X-Client-Type: web setea la cookie HttpOnly y omite el refreshToken del body', async () => {
      const iniciarSesion = {
        execute: jest.fn().mockResolvedValue(resultadoUseCase),
      };
      const controller = crearController({ iniciarSesion });
      const res = crearResponse();

      const resultado = await controller.login(
        credenciales,
        crearRequest(),
        res as never,
        'web',
      );

      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'refresh-token',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
      expect(resultado).not.toHaveProperty('refreshToken');
      expect(resultado).toMatchObject({
        accessToken: 'access-token',
        usuario: resultadoUseCase.usuario,
      });
    });
  });

  describe('POST /auth/refrescar', () => {
    const resultadoUseCase = {
      accessToken: 'nuevo-access-token',
      refreshToken: 'nuevo-refresh-token',
    };

    it('toma el refreshToken del body cuando no hay cookie (flujo App)', async () => {
      const refrescarSesion = {
        execute: jest.fn().mockResolvedValue(resultadoUseCase),
      };
      const controller = crearController({ refrescarSesion });
      const res = crearResponse();

      const resultado = await controller.refrescar(
        { refreshToken: 'token-del-body' },
        crearRequest(),
        res as never,
        undefined,
      );

      expect(refrescarSesion.execute).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'token-del-body' }),
      );
      expect(resultado).toEqual(resultadoUseCase);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('prioriza el refreshToken de la cookie sobre el del body', async () => {
      const refrescarSesion = {
        execute: jest.fn().mockResolvedValue(resultadoUseCase),
      };
      const controller = crearController({ refrescarSesion });
      const res = crearResponse();

      await controller.refrescar(
        { refreshToken: 'token-del-body' },
        crearRequest({ cookies: { [REFRESH_COOKIE_NAME]: 'token-de-cookie' } }),
        res as never,
        'web',
      );

      expect(refrescarSesion.execute).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'token-de-cookie' }),
      );
    });

    it('con X-Client-Type: web vuelve a setear la cookie y omite el refreshToken del body', async () => {
      const refrescarSesion = {
        execute: jest.fn().mockResolvedValue(resultadoUseCase),
      };
      const controller = crearController({ refrescarSesion });
      const res = crearResponse();

      const resultado = await controller.refrescar(
        {},
        crearRequest({ cookies: { [REFRESH_COOKIE_NAME]: 'token-de-cookie' } }),
        res as never,
        'web',
      );

      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'nuevo-refresh-token',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
      expect(resultado).not.toHaveProperty('refreshToken');
      expect(resultado).toEqual({ accessToken: 'nuevo-access-token' });
    });
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
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        AuthController.prototype.recuperarContrasena,
      ),
    ).toBe(HttpStatus.OK);
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
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        AuthController.prototype.restablecer,
      ),
    ).toBe(HttpStatus.OK);
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

  it('POST /auth/cambiar-contrasena está protegido y usa la identidad del guard', async () => {
    const cambiarContrasena = {
      execute: jest.fn().mockResolvedValue({
        message: MENSAJE_CONTRASENA_CAMBIADA,
      }),
    };
    const controller = crearController({ cambiarContrasena });

    const resultado = await controller.cambiar(
      {
        usuarioId: 'usuario-desde-guard',
        sid: 'sid-desde-guard',
      },
      {
        passwordActual: 'ClaveActual1!',
        nuevaPassword: 'ClaveNueva1!',
      },
    );

    expect(cambiarContrasena.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      sid: 'sid-desde-guard',
      passwordActual: 'ClaveActual1!',
      nuevaPassword: 'ClaveNueva1!',
    });
    expect(resultado).toEqual({ message: MENSAJE_CONTRASENA_CAMBIADA });
    expect(resultado).not.toHaveProperty('passwordHash');
    expect(resultado).not.toHaveProperty('accessToken');
    expect(resultado).not.toHaveProperty('refreshToken');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.cambiar),
    ).toEqual([AccessAuthGuard]);
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.cambiar),
    ).toBe(HttpStatus.OK);
  });
});
