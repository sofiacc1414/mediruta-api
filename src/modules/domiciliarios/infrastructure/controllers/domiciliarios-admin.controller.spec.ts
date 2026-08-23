import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AprobarDomiciliarioUseCase } from '../../application/use-cases/aprobar-domiciliario.use-case';
import { ListarDomiciliariosPendientesUseCase } from '../../application/use-cases/listar-domiciliarios-pendientes.use-case';
import { ObtenerDetalleDomiciliarioUseCase } from '../../application/use-cases/obtener-detalle-domiciliario.use-case';
import { RechazarDomiciliarioUseCase } from '../../application/use-cases/rechazar-domiciliario.use-case';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ROLES_METADATA_KEY } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { DomiciliariosAdminController } from './domiciliarios-admin.controller';

const identidad = { usuarioId: 'admin-desde-guard', sid: 'sid-desde-guard' };

function crearController(overrides?: {
  listarPendientes?: { execute: jest.Mock };
  obtenerDetalle?: { execute: jest.Mock };
  aprobarDomiciliario?: { execute: jest.Mock };
  rechazarDomiciliario?: { execute: jest.Mock };
}) {
  return new DomiciliariosAdminController(
    (overrides?.listarPendientes ?? {
      execute: jest.fn(),
    }) as unknown as ListarDomiciliariosPendientesUseCase,
    (overrides?.obtenerDetalle ?? {
      execute: jest.fn(),
    }) as unknown as ObtenerDetalleDomiciliarioUseCase,
    (overrides?.aprobarDomiciliario ?? {
      execute: jest.fn(),
    }) as unknown as AprobarDomiciliarioUseCase,
    (overrides?.rechazarDomiciliario ?? {
      execute: jest.fn(),
    }) as unknown as RechazarDomiciliarioUseCase,
  );
}

describe('DomiciliariosAdminController', () => {
  it('exige AccessAuthGuard y RolesGuard, con roles ADMINISTRADOR/ROOT', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, DomiciliariosAdminController),
    ).toEqual([AccessAuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata(ROLES_METADATA_KEY, DomiciliariosAdminController),
    ).toEqual(['ADMINISTRADOR', 'ROOT']);
  });

  it('GET /admin/domiciliarios/pendientes usa la identidad autenticada', async () => {
    const listarPendientes = { execute: jest.fn().mockResolvedValue([]) };
    const controller = crearController({ listarPendientes });

    await controller.pendientes(identidad);

    expect(listarPendientes.execute).toHaveBeenCalledWith('admin-desde-guard');
  });

  it('GET /admin/domiciliarios/:id delega en ObtenerDetalleDomiciliarioUseCase', async () => {
    const obtenerDetalle = { execute: jest.fn().mockResolvedValue({}) };
    const controller = crearController({ obtenerDetalle });

    await controller.detalle(identidad, 'domiciliario-uuid');

    expect(obtenerDetalle.execute).toHaveBeenCalledWith(
      'admin-desde-guard',
      'domiciliario-uuid',
    );
  });

  it('POST /admin/domiciliarios/:id/aprobar delega en AprobarDomiciliarioUseCase', async () => {
    const aprobarDomiciliario = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ aprobarDomiciliario });

    await controller.aprobar(identidad, 'domiciliario-uuid');

    expect(aprobarDomiciliario.execute).toHaveBeenCalledWith(
      'admin-desde-guard',
      'domiciliario-uuid',
    );
  });

  it('POST /admin/domiciliarios/:id/rechazar delega en RechazarDomiciliarioUseCase con el motivo', async () => {
    const rechazarDomiciliario = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ rechazarDomiciliario });

    await controller.rechazar(identidad, 'domiciliario-uuid', {
      motivo: 'Falta SOAT',
    });

    expect(rechazarDomiciliario.execute).toHaveBeenCalledWith(
      'admin-desde-guard',
      'domiciliario-uuid',
      'Falta SOAT',
    );
  });
});
