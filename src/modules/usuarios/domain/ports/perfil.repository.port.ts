export type PerfilPaciente = {
  direccion: string | null;
  fechaNacimiento: string | null;
  fotoCedulaPath: string | null;
};

export type PerfilDomiciliario = {
  direccion: string | null;
  vehiculoTipo: string | null;
  vehiculoPlaca: string | null;
  cedulaPath: string | null;
  licenciaPath: string | null;
  soatPath: string | null;
  tecnicomecanicaPath: string | null;
};

export type Perfil = {
  nombreCompleto: string | null;
  telefono: string | null;
  paciente: PerfilPaciente | null;
  domiciliario: PerfilDomiciliario | null;
};

export type TipoDocumentoDomiciliario =
  'cedula' | 'licencia' | 'soat' | 'tecnicomecanica';

export abstract class PerfilRepositoryPort {
  /** G02. `null` si la cuenta no existe o no está activa. */
  abstract obtenerPerfil(usuarioId: string): Promise<Perfil | null>;

  /** G03/G04 — nombre y teléfono. */
  abstract actualizarDatosComunes(
    usuarioId: string,
    nombreCompleto: string,
    telefono: string,
  ): Promise<boolean>;

  /** G01/G03 — dirección + fecha de nacimiento del Paciente. */
  abstract upsertPerfilPaciente(
    usuarioId: string,
    direccion: string,
    fechaNacimiento: string,
  ): Promise<boolean>;

  /** G01/G03 — foto de cédula del Paciente (ya subida a Storage). */
  abstract actualizarFotoCedulaPaciente(
    usuarioId: string,
    path: string,
  ): Promise<boolean>;

  /** G01/G03 — dirección + vehículo del Domiciliario. */
  abstract upsertPerfilDomiciliario(
    usuarioId: string,
    direccion: string,
    vehiculoTipo: string,
    vehiculoPlaca: string,
  ): Promise<boolean>;

  /** G01/G03 — documento del Domiciliario (ya subido a Storage). */
  abstract actualizarDocumentoDomiciliario(
    usuarioId: string,
    tipo: TipoDocumentoDomiciliario,
    path: string,
  ): Promise<boolean>;

  /** G05 — revoca todas las sesiones y desactiva la cuenta. */
  abstract desactivarCuenta(usuarioId: string, sid: string): Promise<boolean>;
}
