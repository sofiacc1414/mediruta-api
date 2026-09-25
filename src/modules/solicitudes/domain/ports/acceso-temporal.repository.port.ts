export type PuntoFarmaciaAcceso = {
  estado: string;
  farmaciaLat: number | null;
  farmaciaLng: number | null;
};

export type ResultadoAcceso = 'permitido' | 'rechazado' | 'expirado';

export type RegistroAcceso = {
  solicitudId: string;
  domiciliarioId: string;
  resultado: ResultadoAcceso;
  lat: number | null;
  lng: number | null;
  expiraEn: Date | null;
};

export abstract class AccesoTemporalRepositoryPort {
  abstract puntoFarmacia(
    domiciliarioId: string,
    solicitudId: string,
  ): Promise<PuntoFarmaciaAcceso | null>;

  /** Marca vencidos, revoca activos previos si este intento se permite,
   * y deja la fila de auditoría. */
  abstract registrar(datos: RegistroAcceso): Promise<void>;

  abstract revocarPorPedido(solicitudId: string): Promise<void>;
}
