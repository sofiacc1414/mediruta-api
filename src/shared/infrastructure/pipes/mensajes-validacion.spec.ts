// `DatosSolicitudDto` usa `@Type(() => MedicamentoDto)` (class-transformer),
// que necesita el polyfill de `reflect-metadata` cargado — al correr esta
// spec sola (no como parte de la suite completa) nada más lo importa antes.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IniciarSesionDto } from '../../../modules/usuarios/infrastructure/dtos/iniciar-sesion.dto';
import { RegistrarUsuarioDto } from '../../../modules/usuarios/infrastructure/dtos/registrar-usuario.dto';
import { DatosSolicitudDto } from '../../../modules/solicitudes/infrastructure/dtos/datos-solicitud.dto';
import { exceptionFactoryEnEspanol } from './mensajes-validacion';

describe('exceptionFactoryEnEspanol', () => {
  it('traduce los mensajes default de class-validator (isEmail/isNotEmpty) al español', async () => {
    const dto = plainToInstance(IniciarSesionDto, {
      correo: 'no-es-email',
      password: '',
    });
    const errores = await validate(dto);

    const excepcion = exceptionFactoryEnEspanol(errores);
    const mensajes = (excepcion.getResponse() as { message: string[] }).message;

    expect(mensajes).toContain(
      'El campo «correo» debe ser un correo electrónico válido.',
    );
    expect(mensajes).toContain('El campo «contraseña» no puede quedar vacío.');
    // Nada en inglés se cuela.
    for (const mensaje of mensajes) {
      expect(mensaje).not.toMatch(/must be|should not|is not/i);
    }
  });

  it('incluye el límite de caracteres en maxLength/minLength', async () => {
    const dto = plainToInstance(IniciarSesionDto, {
      correo: `${'a'.repeat(250)}@mail.com`,
      password: 'ClaveSegura1!',
    });
    const errores = await validate(dto);

    const mensajes = (
      exceptionFactoryEnEspanol(errores).getResponse() as { message: string[] }
    ).message;
    expect(mensajes.some((m) => m.includes('254 caracteres'))).toBe(true);
  });

  it('no pisa un mensaje ya personalizado en el propio decorator (IsEnum)', async () => {
    const dto = plainToInstance(RegistrarUsuarioDto, {
      correo: 'persona@mail.com',
      password: 'ClaveSegura1!',
      tipoRegistro: 'NO_EXISTE',
    });
    const errores = await validate(dto);

    const mensajes = (
      exceptionFactoryEnEspanol(errores).getResponse() as { message: string[] }
    ).message;
    expect(mensajes).toContain(
      'El tipo de registro solo puede ser PACIENTE o DOMICILIARIO.',
    );
  });

  it('traduce errores anidados (@ValidateNested) con la ruta legible del medicamento', async () => {
    const dto = plainToInstance(DatosSolicitudDto, {
      medicamentos: [{ nombre: 'a'.repeat(250) }],
    });
    const errores = await validate(dto);

    const mensajes = (
      exceptionFactoryEnEspanol(errores).getResponse() as { message: string[] }
    ).message;
    expect(
      mensajes.some((m) => m.startsWith('El campo «medicamentos[1].nombre»')),
    ).toBe(true);
  });
});
