import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/** Traduce los mensajes que arma `class-validator` (en inglés por
 * defecto, ej. "correo must be an email") al español — el resto de la
 * API (mensajes de dominio, filtros HTTP) ya está en español, esto
 * cierra el único hueco: la respuesta 400 del `ValidationPipe` global
 * (ver `main.ts`).
 *
 * No reemplaza mensajes ya personalizados en un decorator (`Matches`,
 * `IsEnum`, `IsIn`, `EsFechaPasada` con `{ message: '...' }`) — esos ya
 * vienen en español desde el propio DTO y se dejan pasar tal cual. Solo
 * traduce las reglas "genéricas" (`IsString`, `IsEmail`, `IsNotEmpty`,
 * `MaxLength`, ...) que class-validator arma con su texto default.
 *
 * El patrón "El campo «X» ..." evita tener que declinar por género
 * (vacío/vacía, obligatorio/obligatoria) según el nombre del campo —
 * concuerda siempre con "El campo" (masculino), sea cual sea X. */

type ConstructorMensaje = (etiqueta: string, mensajeOriginal: string) => string;

const PLANTILLAS_POR_CONSTRAINT: Record<string, ConstructorMensaje> = {
  isString: (etiqueta) => `El campo «${etiqueta}» debe ser un texto.`,
  isEmail: (etiqueta) =>
    `El campo «${etiqueta}» debe ser un correo electrónico válido.`,
  isNotEmpty: (etiqueta) => `El campo «${etiqueta}» no puede quedar vacío.`,
  isDefined: (etiqueta) => `El campo «${etiqueta}» es obligatorio.`,
  isBoolean: (etiqueta) => `El campo «${etiqueta}» debe ser verdadero o falso.`,
  isArray: (etiqueta) => `El campo «${etiqueta}» debe ser una lista.`,
  isDateString: (etiqueta) =>
    `El campo «${etiqueta}» debe ser una fecha válida.`,
  isNumber: (etiqueta) => `El campo «${etiqueta}» debe ser un número.`,
  isInt: (etiqueta) => `El campo «${etiqueta}» debe ser un número entero.`,
  isPositive: (etiqueta) =>
    `El campo «${etiqueta}» debe ser un número positivo.`,
  isUrl: (etiqueta) => `El campo «${etiqueta}» debe ser una URL válida.`,
  isUuid: (etiqueta) => `El campo «${etiqueta}» no tiene un formato válido.`,
  isLatitude: (etiqueta) => `El campo «${etiqueta}» no es una latitud válida.`,
  isLongitude: (etiqueta) =>
    `El campo «${etiqueta}» no es una longitud válida.`,
  whitelistValidation: (etiqueta) =>
    `El campo «${etiqueta}» no es un campo permitido.`,
  maxLength: (etiqueta, mensajeOriginal) => {
    const limite = extraerNumero(mensajeOriginal);
    return limite != null
      ? `El campo «${etiqueta}» no puede tener más de ${limite} caracteres.`
      : `El campo «${etiqueta}» es demasiado largo.`;
  },
  minLength: (etiqueta, mensajeOriginal) => {
    const limite = extraerNumero(mensajeOriginal);
    return limite != null
      ? `El campo «${etiqueta}» debe tener al menos ${limite} caracteres.`
      : `El campo «${etiqueta}» es demasiado corto.`;
  },
  arrayMinSize: (etiqueta, mensajeOriginal) => {
    const limite = extraerNumero(mensajeOriginal);
    return limite != null
      ? `El campo «${etiqueta}» debe tener al menos ${limite} elemento(s).`
      : `El campo «${etiqueta}» tiene muy pocos elementos.`;
  },
  arrayMaxSize: (etiqueta, mensajeOriginal) => {
    const limite = extraerNumero(mensajeOriginal);
    return limite != null
      ? `El campo «${etiqueta}» no puede tener más de ${limite} elemento(s).`
      : `El campo «${etiqueta}» tiene demasiados elementos.`;
  },
};

/** Nombres de propiedad que quedan raros mostrados tal cual (en inglés,
 * o siglas) — el resto de los campos del proyecto ya se llaman en
 * español (correo, direccion, telefono, ...) y se muestran sin cambios. */
const ETIQUETAS_PERSONALIZADAS: Record<string, string> = {
  password: 'contraseña',
  refreshToken: 'token de actualización',
};

function extraerNumero(mensaje: string): number | null {
  const coincidencia = mensaje.match(/(\d+)/);
  return coincidencia ? Number(coincidencia[1]) : null;
}

function etiquetaPara(propiedad: string): string {
  return ETIQUETAS_PERSONALIZADAS[propiedad] ?? propiedad;
}

/** Arma la ruta legible de un campo anidado (ej. un `MedicamentoDto`
 * dentro de `medicamentos` vía `@ValidateNested`) — un índice numérico
 * se muestra como `medicamentos[1]` (1-based) en vez de `medicamentos.0`. */
function construirRuta(prefijo: string, propiedad: string): string {
  if (/^\d+$/.test(propiedad)) {
    return `${prefijo}[${Number(propiedad) + 1}]`;
  }
  return prefijo
    ? `${prefijo}.${etiquetaPara(propiedad)}`
    : etiquetaPara(propiedad);
}

function traducirConstraint(
  clave: string,
  mensajeOriginal: string,
  etiqueta: string,
): string {
  const plantilla = PLANTILLAS_POR_CONSTRAINT[clave];
  return plantilla ? plantilla(etiqueta, mensajeOriginal) : mensajeOriginal;
}

function aplanarErrores(errores: ValidationError[], prefijo = ''): string[] {
  const mensajes: string[] = [];
  for (const error of errores) {
    const ruta = construirRuta(prefijo, error.property);
    if (error.constraints) {
      for (const [clave, mensajeOriginal] of Object.entries(
        error.constraints,
      )) {
        mensajes.push(traducirConstraint(clave, mensajeOriginal, ruta));
      }
    }
    if (error.children?.length) {
      mensajes.push(...aplanarErrores(error.children, ruta));
    }
  }
  return mensajes;
}

/** `exceptionFactory` del `ValidationPipe` global (ver `main.ts`). */
export function exceptionFactoryEnEspanol(
  errores: ValidationError[],
): BadRequestException {
  return new BadRequestException(aplanarErrores(errores));
}
