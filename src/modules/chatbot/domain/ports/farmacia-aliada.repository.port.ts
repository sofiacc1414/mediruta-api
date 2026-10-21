import {
  FarmaciaAliada,
  FarmaciaAliadaAdmin,
  ResultadoEliminarFarmaciaAliadaAdmin,
  ResultadoGuardarFarmaciaAliadaAdmin,
} from '../farmacia-aliada';

export abstract class FarmaciaAliadaRepositoryPort {
  /** Usado por el chatbot (CA1 — "¿cuáles son las farmacias de mi
   * EPS?"). Solo activas, filtradas por EPS. */
  abstract listarPorEps(usuarioId: string, eps: string): Promise<FarmaciaAliada[]>;

  // --- Admin ---
  abstract listarAdmin(adminId: string): Promise<FarmaciaAliadaAdmin[]>;

  abstract guardarAdmin(
    adminId: string,
    id: string | null,
    eps: string,
    nombreFarmacia: string,
    ciudad: string,
    departamento: string | null,
    direccion: string | null,
    telefono: string | null,
    activo: boolean,
  ): Promise<ResultadoGuardarFarmaciaAliadaAdmin>;

  abstract eliminarAdmin(
    adminId: string,
    id: string,
  ): Promise<ResultadoEliminarFarmaciaAliadaAdmin>;
}
