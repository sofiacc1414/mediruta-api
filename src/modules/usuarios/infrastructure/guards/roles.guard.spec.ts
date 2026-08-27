import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolNoAutorizadoError } from '../../domain/errors/rol-no-autorizado.error';
import { IDENTIDAD_REQUEST_KEY } from '../../domain/identidad-autenticada';
import { UsuarioRepositoryPort } from '../../domain/ports/usuario.repository.port';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

const USUARIO_ID = '11111111-1111-4111-8111-111111111111';

// `@Roles(...)` puesto a nivel de CLASE, igual que en
// DomiciliariosAdminController — no a nivel de método. Es justamente el
// caso que un Reflector mockeado a mano no hubiera detectado: se probó
// en vivo contra la API real y una cuenta sin el rol pasaba el guard
// igual, porque `reflector.get(key, context.getHandler())` solo mira el
// método. Por eso este spec usa un Reflector real, no un fake.
@Roles('ADMINISTRADOR', 'ROOT')
class ControllerDeRolesEnLaClase {
  metodoSinDecorarPropio() {}
}

class ControllerSinRoles {
  metodoSinDecorarPropio() {}
}

function contextoCon(
  claseControlador: new () => { metodoSinDecorarPropio(): void },
  identidad?: { usuarioId: string; sid: string },
) {
  const request: {
    [IDENTIDAD_REQUEST_KEY]?: { usuarioId: string; sid: string };
  } = {
    [IDENTIDAD_REQUEST_KEY]: identidad,
  };
  const instancia = new claseControlador();
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => instancia.metodoSinDecorarPropio,
    getClass: () => claseControlador,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const usuarios: UsuarioRepositoryPort = {
    registrar: jest.fn(),
    obtenerCredencialesLogin: jest.fn(),
    obtenerCuentaActual: jest.fn(),
    obtenerRoles: jest.fn(),
    solicitarRolPaciente: jest.fn(),
    solicitarRolDomiciliario: jest.fn(),
    enviarSolicitudDomiciliario: jest.fn(),
    crearAdministrador: jest.fn(),
    listarAdministradores: jest.fn(),
    obtenerAdministrador: jest.fn(),
  };
  const guard = new RolesGuard(reflector, usuarios);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('deja pasar si el endpoint no pide ningún rol (metadata solo a nivel de clase, sin @Roles)', async () => {
    await expect(
      guard.canActivate(contextoCon(ControllerSinRoles)),
    ).resolves.toBe(true);
    expect(usuarios.obtenerRoles).not.toHaveBeenCalled();
  });

  it('lee @Roles puesto a nivel de CLASE (regresión: antes solo miraba el método y dejaba pasar a cualquiera)', async () => {
    await expect(
      guard.canActivate(contextoCon(ControllerDeRolesEnLaClase)),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('rechaza si no hay identidad en el request', async () => {
    await expect(
      guard.canActivate(contextoCon(ControllerDeRolesEnLaClase)),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('rechaza si la cuenta no tiene ninguno de los roles pedidos', async () => {
    (usuarios.obtenerRoles as jest.Mock).mockResolvedValue([
      { codigo: 'PACIENTE', estado: 'habilitado' },
    ]);

    await expect(
      guard.canActivate(
        contextoCon(ControllerDeRolesEnLaClase, { usuarioId: USUARIO_ID, sid: 'sid' }),
      ),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('rechaza si tiene el rol pero no está habilitado', async () => {
    (usuarios.obtenerRoles as jest.Mock).mockResolvedValue([
      { codigo: 'ADMINISTRADOR', estado: 'pendiente_validacion' },
    ]);

    await expect(
      guard.canActivate(
        contextoCon(ControllerDeRolesEnLaClase, { usuarioId: USUARIO_ID, sid: 'sid' }),
      ),
    ).rejects.toBeInstanceOf(RolNoAutorizadoError);
  });

  it('deja pasar si tiene alguno de los roles pedidos habilitado', async () => {
    (usuarios.obtenerRoles as jest.Mock).mockResolvedValue([
      { codigo: 'ROOT', estado: 'habilitado' },
    ]);

    await expect(
      guard.canActivate(
        contextoCon(ControllerDeRolesEnLaClase, { usuarioId: USUARIO_ID, sid: 'sid' }),
      ),
    ).resolves.toBe(true);
  });
});
