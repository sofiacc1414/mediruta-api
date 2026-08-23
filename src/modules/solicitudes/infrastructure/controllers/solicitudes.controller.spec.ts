import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_METADATA_KEY } from '../../../usuarios/infrastructure/decorators/roles.decorator';
import { AccessAuthGuard } from '../../../usuarios/infrastructure/guards/access-auth.guard';
import { RolesGuard } from '../../../usuarios/infrastructure/guards/roles.guard';
import { ActualizarSolicitudUseCase } from '../../application/use-cases/actualizar-solicitud.use-case';
import { CancelarSolicitudUseCase } from '../../application/use-cases/cancelar-solicitud.use-case';
import { CrearSolicitudUseCase } from '../../application/use-cases/crear-solicitud.use-case';
import { EnviarSolicitudUseCase } from '../../application/use-cases/enviar-solicitud.use-case';
import { ListarSolicitudesUseCase } from '../../application/use-cases/listar-solicitudes.use-case';
import { ObtenerSolicitudUseCase } from '../../application/use-cases/obtener-solicitud.use-case';
import { SubirRecetaUseCase } from '../../application/use-cases/subir-receta.use-case';
import { DatosSolicitudDto } from '../dtos/datos-solicitud.dto';
import { SolicitudesController } from './solicitudes.controller';

const identidad = { usuarioId: 'paciente-desde-guard', sid: 'sid-desde-guard' };

const DTO_VACIO: DatosSolicitudDto = {};
const DATOS_VACIOS = {
  medicamentos: [],
  recetaFechaVencimiento: null,
  direccionEntrega: null,
};

function archivoFalso(): Express.Multer.File {
  return {
    buffer: Buffer.from('contenido'),
    mimetype: 'image/jpeg',
    originalname: 'receta.jpg',
  } as Express.Multer.File;
}

function crearController(overrides?: {
  crearSolicitud?: { execute: jest.Mock };
  listarSolicitudes?: { execute: jest.Mock };
  obtenerSolicitud?: { execute: jest.Mock };
  actualizarSolicitud?: { execute: jest.Mock };
  subirReceta?: { execute: jest.Mock };
  enviarSolicitud?: { execute: jest.Mock };
  cancelarSolicitud?: { execute: jest.Mock };
}) {
  return new SolicitudesController(
    (overrides?.crearSolicitud ?? {
      execute: jest.fn(),
    }) as unknown as CrearSolicitudUseCase,
    (overrides?.listarSolicitudes ?? {
      execute: jest.fn(),
    }) as unknown as ListarSolicitudesUseCase,
    (overrides?.obtenerSolicitud ?? {
      execute: jest.fn(),
    }) as unknown as ObtenerSolicitudUseCase,
    (overrides?.actualizarSolicitud ?? {
      execute: jest.fn(),
    }) as unknown as ActualizarSolicitudUseCase,
    (overrides?.subirReceta ?? {
      execute: jest.fn(),
    }) as unknown as SubirRecetaUseCase,
    (overrides?.enviarSolicitud ?? {
      execute: jest.fn(),
    }) as unknown as EnviarSolicitudUseCase,
    (overrides?.cancelarSolicitud ?? {
      execute: jest.fn(),
    }) as unknown as CancelarSolicitudUseCase,
  );
}

describe('SolicitudesController', () => {
  it('exige AccessAuthGuard y RolesGuard, con rol PACIENTE', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SolicitudesController)).toEqual(
      [AccessAuthGuard, RolesGuard],
    );
    expect(
      Reflect.getMetadata(ROLES_METADATA_KEY, SolicitudesController),
    ).toEqual(['PACIENTE']);
  });

  it('POST /solicitudes delega en CrearSolicitudUseCase con la identidad y los datos', async () => {
    const crearSolicitud = {
      execute: jest.fn().mockResolvedValue({ id: 'solicitud-uuid' }),
    };
    const controller = crearController({ crearSolicitud });

    await controller.crear(identidad, DTO_VACIO);

    expect(crearSolicitud.execute).toHaveBeenCalledWith({
      pacienteId: 'paciente-desde-guard',
      ...DATOS_VACIOS,
    });
  });

  it('POST /solicitudes mapea los medicamentos del DTO', async () => {
    const crearSolicitud = {
      execute: jest.fn().mockResolvedValue({ id: 'solicitud-uuid' }),
    };
    const controller = crearController({ crearSolicitud });

    await controller.crear(identidad, {
      medicamentos: [{ nombre: 'Acetaminofén' }],
    });

    expect(crearSolicitud.execute).toHaveBeenCalledWith({
      pacienteId: 'paciente-desde-guard',
      medicamentos: [
        {
          nombre: 'Acetaminofén',
          concentracion: null,
          formaFarmaceutica: null,
          cantidad: null,
          posologia: null,
        },
      ],
      recetaFechaVencimiento: null,
      direccionEntrega: null,
    });
  });

  it('GET /solicitudes usa la identidad autenticada', async () => {
    const listarSolicitudes = { execute: jest.fn().mockResolvedValue([]) };
    const controller = crearController({ listarSolicitudes });

    await controller.listar(identidad);

    expect(listarSolicitudes.execute).toHaveBeenCalledWith(
      'paciente-desde-guard',
    );
  });

  it('GET /solicitudes/:id delega en ObtenerSolicitudUseCase', async () => {
    const obtenerSolicitud = { execute: jest.fn().mockResolvedValue({}) };
    const controller = crearController({ obtenerSolicitud });

    await controller.detalle(identidad, 'solicitud-uuid');

    expect(obtenerSolicitud.execute).toHaveBeenCalledWith(
      'paciente-desde-guard',
      'solicitud-uuid',
    );
  });

  it('PATCH /solicitudes/:id delega en ActualizarSolicitudUseCase con la identidad y los datos', async () => {
    const actualizarSolicitud = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ actualizarSolicitud });

    await controller.actualizar(identidad, 'solicitud-uuid', DTO_VACIO);

    expect(actualizarSolicitud.execute).toHaveBeenCalledWith({
      pacienteId: 'paciente-desde-guard',
      solicitudId: 'solicitud-uuid',
      ...DATOS_VACIOS,
    });
  });

  it('POST /solicitudes/:id/receta deriva la extensión del mimetype', async () => {
    const subirReceta = {
      execute: jest.fn().mockResolvedValue({ message: 'ok', url: 'https://x' }),
    };
    const controller = crearController({ subirReceta });
    const archivo = archivoFalso();

    await controller.subirFotoReceta(identidad, 'solicitud-uuid', archivo);

    expect(subirReceta.execute).toHaveBeenCalledWith({
      pacienteId: 'paciente-desde-guard',
      solicitudId: 'solicitud-uuid',
      contenido: archivo.buffer,
      contentType: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('POST /solicitudes/:id/enviar delega en EnviarSolicitudUseCase', async () => {
    const enviarSolicitud = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ enviarSolicitud });

    await controller.enviar(identidad, 'solicitud-uuid');

    expect(enviarSolicitud.execute).toHaveBeenCalledWith(
      'paciente-desde-guard',
      'solicitud-uuid',
    );
  });

  it('POST /solicitudes/:id/cancelar delega en CancelarSolicitudUseCase', async () => {
    const cancelarSolicitud = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ cancelarSolicitud });

    await controller.cancelar(identidad, 'solicitud-uuid');

    expect(cancelarSolicitud.execute).toHaveBeenCalledWith(
      'paciente-desde-guard',
      'solicitud-uuid',
    );
  });
});
