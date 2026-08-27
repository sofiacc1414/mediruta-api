export type PerfilPaciente = {
  direccion: string | null;
  fechaNacimiento: string | null;
  /** La cédula colombiana trae información necesaria en las dos caras
   * — ambos lados son obligatorios para poder enviar una solicitud
   * (`app.crear_solicitud` exige los dos). */
  fotoCedulaFrentePath: string | null;
  fotoCedulaReversoPath: string | null;
  /** HU-09 — contexto para geocodificar tanto esta dirección (default
   * de la de entrega en una solicitud) como la de farmacia de cada
   * pedido (se asume la misma ciudad del paciente). */
  departamento: string | null;
  ciudad: string | null;
};

/** HU-09 — resultado de prender/apagar "Disponible para recibir
 * pedidos". `no_autorizado` si la cuenta no tiene DOMICILIARIO
 * habilitado. */
export type ResultadoActualizarDisponibilidad =
  | 'actualizado'
  | 'no_autorizado'
  | 'no_encontrado';

export type PerfilDomiciliario = {
  direccion: string | null;
  vehiculoTipo: string | null;
  vehiculoPlaca: string | null;
  cedulaFrentePath: string | null;
  cedulaReversoPath: string | null;
  licenciaPath: string | null;
  soatPath: string | null;
  tecnicomecanicaPath: string | null;
};

export type Perfil = {
  nombreCompleto: string | null;
  telefono: string | null;
  fotoPerfilPath: string | null;
  paciente: PerfilPaciente | null;
  domiciliario: PerfilDomiciliario | null;
};

export type TipoDocumentoDomiciliario =
  | 'cedula_frente'
  | 'cedula_reverso'
  | 'licencia'
  | 'soat'
  | 'tecnicomecanica';

/** Lado de la cédula del Paciente — la API exige los dos antes de dejar
 * enviar una solicitud (`app.crear_solicitud`). */
export type LadoDocumento = 'frente' | 'reverso';

export abstract class PerfilRepositoryPort {
  /** G02. `null` si la cuenta no existe o no está activa. */
  abstract obtenerPerfil(usuarioId: string): Promise<Perfil | null>;

  /** G03/G04 — nombre y teléfono. */
  abstract actualizarDatosComunes(
    usuarioId: string,
    nombreCompleto: string,
    telefono: string,
  ): Promise<boolean>;

  /** G01/G03 — dirección + fecha de nacimiento del Paciente.
   * departamento/ciudad son obligatorios desde HU-09 (contexto de
   * geocodificación), igual que el resto de los campos acá. */
  abstract upsertPerfilPaciente(
    usuarioId: string,
    direccion: string,
    fechaNacimiento: string,
    departamento: string,
    ciudad: string,
  ): Promise<boolean>;

  /** G01/G03 — foto de un lado de la cédula del Paciente (ya subida a
   * Storage). */
  abstract actualizarFotoCedulaPaciente(
    usuarioId: string,
    lado: LadoDocumento,
    path: string,
  ): Promise<boolean>;

  /** Foto de perfil (avatar), común a cualquier rol (ya subida a Storage). */
  abstract actualizarFotoPerfil(
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

  /** HU-09 — prende/apaga "Disponible para recibir pedidos". La
   * ubicación (lat/lng, la manda el celular) solo se guarda cuando
   * `disponible = true` — es una foto instantánea de ese momento, no
   * tracking continuo. */
  abstract actualizarDisponibilidadDomiciliario(
    usuarioId: string,
    disponible: boolean,
    lat: number | null,
    lng: number | null,
  ): Promise<ResultadoActualizarDisponibilidad>;
}
