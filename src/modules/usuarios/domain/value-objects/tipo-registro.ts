/**
 * Tipos de registro público (HU-01).
 * ADMINISTRADOR y ROOT no son registro público.
 */
export enum TipoRegistro {
  PACIENTE = 'PACIENTE',
  DOMICILIARIO = 'DOMICILIARIO',
}

export function esTipoRegistroPublico(valor: string): valor is TipoRegistro {
  return valor === TipoRegistro.PACIENTE || valor === TipoRegistro.DOMICILIARIO;
}
