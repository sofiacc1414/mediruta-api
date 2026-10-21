/** Lo que ve el chatbot/Paciente al preguntar "¿cuáles son las
 * farmacias de mi EPS?" — solo activas. */
export type FarmaciaAliada = {
  id: string;
  eps: string;
  nombreFarmacia: string;
  ciudad: string;
  departamento: string | null;
  direccion: string | null;
  telefono: string | null;
};

/** Catálogo completo (incluye inactivas) — solo panel admin. */
export type FarmaciaAliadaAdmin = FarmaciaAliada & { activo: boolean };

export type ResultadoGuardarFarmaciaAliadaAdmin =
  | { resultado: 'guardado'; id: string }
  | { resultado: 'no_autorizado' | 'invalido' | 'no_encontrado' };

export type ResultadoEliminarFarmaciaAliadaAdmin =
  'eliminado' | 'no_autorizado' | 'no_encontrado';
