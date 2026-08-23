import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ActualizarDatosComunesUseCase } from '../../application/use-cases/actualizar-datos-comunes.use-case';
import { ActualizarPerfilDomiciliarioUseCase } from '../../application/use-cases/actualizar-perfil-domiciliario.use-case';
import { ActualizarPerfilPacienteUseCase } from '../../application/use-cases/actualizar-perfil-paciente.use-case';
import { DesactivarCuentaUseCase } from '../../application/use-cases/desactivar-cuenta.use-case';
import { ObtenerPerfilUseCase } from '../../application/use-cases/obtener-perfil.use-case';
import { SolicitarRolDomiciliarioUseCase } from '../../application/use-cases/solicitar-rol-domiciliario.use-case';
import { SolicitarRolPacienteUseCase } from '../../application/use-cases/solicitar-rol-paciente.use-case';
import { SubirDocumentoDomiciliarioUseCase } from '../../application/use-cases/subir-documento-domiciliario.use-case';
import { SubirFotoCedulaPacienteUseCase } from '../../application/use-cases/subir-foto-cedula-paciente.use-case';
import { SubirFotoPerfilUseCase } from '../../application/use-cases/subir-foto-perfil.use-case';
import { AccessAuthGuard } from '../guards/access-auth.guard';
import { PerfilController } from './perfil.controller';

const identidad = { usuarioId: 'usuario-desde-guard', sid: 'sid-desde-guard' };

function archivoFalso(
  overrides?: Partial<Express.Multer.File>,
): Express.Multer.File {
  return {
    buffer: Buffer.from('contenido'),
    mimetype: 'image/jpeg',
    originalname: 'archivo.jpg',
    ...overrides,
  } as Express.Multer.File;
}

function crearController(overrides?: {
  obtenerPerfil?: { execute: jest.Mock };
  actualizarDatosComunes?: { execute: jest.Mock };
  actualizarPerfilPaciente?: { execute: jest.Mock };
  subirFotoCedulaPaciente?: { execute: jest.Mock };
  subirFotoPerfil?: { execute: jest.Mock };
  actualizarPerfilDomiciliario?: { execute: jest.Mock };
  subirDocumentoDomiciliario?: { execute: jest.Mock };
  desactivarCuenta?: { execute: jest.Mock };
  solicitarRolPaciente?: { execute: jest.Mock };
  solicitarRolDomiciliario?: { execute: jest.Mock };
}) {
  return new PerfilController(
    (overrides?.obtenerPerfil ?? {
      execute: jest.fn(),
    }) as unknown as ObtenerPerfilUseCase,
    (overrides?.actualizarDatosComunes ?? {
      execute: jest.fn(),
    }) as unknown as ActualizarDatosComunesUseCase,
    (overrides?.actualizarPerfilPaciente ?? {
      execute: jest.fn(),
    }) as unknown as ActualizarPerfilPacienteUseCase,
    (overrides?.subirFotoCedulaPaciente ?? {
      execute: jest.fn(),
    }) as unknown as SubirFotoCedulaPacienteUseCase,
    (overrides?.subirFotoPerfil ?? {
      execute: jest.fn(),
    }) as unknown as SubirFotoPerfilUseCase,
    (overrides?.actualizarPerfilDomiciliario ?? {
      execute: jest.fn(),
    }) as unknown as ActualizarPerfilDomiciliarioUseCase,
    (overrides?.subirDocumentoDomiciliario ?? {
      execute: jest.fn(),
    }) as unknown as SubirDocumentoDomiciliarioUseCase,
    (overrides?.desactivarCuenta ?? {
      execute: jest.fn(),
    }) as unknown as DesactivarCuentaUseCase,
    (overrides?.solicitarRolPaciente ?? {
      execute: jest.fn(),
    }) as unknown as SolicitarRolPacienteUseCase,
    (overrides?.solicitarRolDomiciliario ?? {
      execute: jest.fn(),
    }) as unknown as SolicitarRolDomiciliarioUseCase,
  );
}

describe('PerfilController', () => {
  it('exige AccessAuthGuard en todo el controller', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PerfilController)).toEqual([
      AccessAuthGuard,
    ]);
  });

  it('GET /perfil usa solo la identidad autenticada', async () => {
    const obtenerPerfil = {
      execute: jest.fn().mockResolvedValue({ nombreCompleto: 'Persona' }),
    };
    const controller = crearController({ obtenerPerfil });

    const resultado = await controller.obtener(identidad);

    expect(obtenerPerfil.execute).toHaveBeenCalledWith('usuario-desde-guard');
    expect(resultado).toEqual({ nombreCompleto: 'Persona' });
  });

  it('PATCH /perfil delega en ActualizarDatosComunesUseCase con la identidad', async () => {
    const actualizarDatosComunes = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ actualizarDatosComunes });

    await controller.actualizarComunes(identidad, {
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
    });

    expect(actualizarDatosComunes.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      nombreCompleto: 'Persona de Prueba',
      telefono: '3001234567',
    });
  });

  it('PATCH /perfil/paciente delega en ActualizarPerfilPacienteUseCase', async () => {
    const actualizarPerfilPaciente = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ actualizarPerfilPaciente });

    await controller.actualizarPaciente(identidad, {
      direccion: 'Calle 123',
      fechaNacimiento: '1990-05-10',
    });

    expect(actualizarPerfilPaciente.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      direccion: 'Calle 123',
      fechaNacimiento: '1990-05-10',
    });
  });

  it('POST /perfil/paciente/foto-cedula deriva la extensión del mimetype', async () => {
    const subirFotoCedulaPaciente = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ subirFotoCedulaPaciente });
    const archivo = archivoFalso({ mimetype: 'image/png' });

    await controller.subirFotoCedula(identidad, archivo);

    expect(subirFotoCedulaPaciente.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      contenido: archivo.buffer,
      contentType: 'image/png',
      extension: 'png',
    });
  });

  it('POST /perfil/foto deriva la extensión del mimetype', async () => {
    const subirFotoPerfil = {
      execute: jest
        .fn()
        .mockResolvedValue({ message: 'ok', url: 'https://firmada.test' }),
    };
    const controller = crearController({ subirFotoPerfil });
    const archivo = archivoFalso({ mimetype: 'image/png' });

    await controller.subirFoto(identidad, archivo);

    expect(subirFotoPerfil.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      contenido: archivo.buffer,
      contentType: 'image/png',
      extension: 'png',
    });
  });

  it('PATCH /perfil/domiciliario delega en ActualizarPerfilDomiciliarioUseCase', async () => {
    const actualizarPerfilDomiciliario = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ actualizarPerfilDomiciliario });

    await controller.actualizarDomiciliario(identidad, {
      direccion: 'Calle 123',
      vehiculoTipo: 'Moto',
      vehiculoPlaca: 'ABC123',
    });

    expect(actualizarPerfilDomiciliario.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      direccion: 'Calle 123',
      vehiculoTipo: 'Moto',
      vehiculoPlaca: 'ABC123',
    });
  });

  it('POST /perfil/domiciliario/documentos pasa el tipo y deriva la extensión', async () => {
    const subirDocumentoDomiciliario = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ subirDocumentoDomiciliario });
    const archivo = archivoFalso({ mimetype: 'application/pdf' });

    await controller.subirDocumento(identidad, { tipo: 'soat' }, archivo);

    expect(subirDocumentoDomiciliario.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      tipo: 'soat',
      contenido: archivo.buffer,
      contentType: 'application/pdf',
      extension: 'pdf',
    });
  });

  it('POST /perfil/paciente/solicitar usa la identidad autenticada', async () => {
    const solicitarRolPaciente = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ solicitarRolPaciente });

    await controller.solicitarPaciente(identidad);

    expect(solicitarRolPaciente.execute).toHaveBeenCalledWith(
      'usuario-desde-guard',
    );
  });

  it('POST /perfil/domiciliario/solicitar usa la identidad autenticada', async () => {
    const solicitarRolDomiciliario = {
      execute: jest.fn().mockResolvedValue({ message: 'ok' }),
    };
    const controller = crearController({ solicitarRolDomiciliario });

    await controller.solicitarDomiciliario(identidad);

    expect(solicitarRolDomiciliario.execute).toHaveBeenCalledWith(
      'usuario-desde-guard',
    );
  });

  it('POST /perfil/desactivar usa la identidad autenticada y responde 204', async () => {
    const desactivarCuenta = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const controller = crearController({ desactivarCuenta });

    await expect(controller.desactivar(identidad)).resolves.toBeUndefined();

    expect(desactivarCuenta.execute).toHaveBeenCalledWith({
      usuarioId: 'usuario-desde-guard',
      sid: 'sid-desde-guard',
    });
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        PerfilController.prototype.desactivar,
      ),
    ).toBe(HttpStatus.NO_CONTENT);
  });
});
