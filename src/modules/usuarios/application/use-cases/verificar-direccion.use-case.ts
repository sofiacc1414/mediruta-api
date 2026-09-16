import { Injectable } from '@nestjs/common';
import {
  CandidatoDireccion,
  GeocodificacionPort,
} from '../../../solicitudes/domain/ports/geocodificacion.port';

export type VerificarDireccionCommand = {
  direccion: string;
  ciudad: string | null;
  departamento: string | null;
};

export type VerificarDireccionResultado = {
  direccionResuelta: string | null;
  precisa: boolean;
  candidatos: CandidatoDireccion[];
};

/** Ronda 12 — bug real reportado: la dirección del perfil recién se
 * validaba contra Nominatim al tocar "Guardar cambios", sin loader ni
 * sugerencias mientras tanto (a diferencia del flujo de pedidos, que
 * geocodifica en vivo al salir del campo — ver `EstimarPrecioPedidoUseCase`).
 * Este caso de uso es el equivalente de solo-lectura para el perfil:
 * geocodifica sin guardar nada, para que la App pueda mostrar el
 * mismo "verificando…" / confirmación / candidatos alternos debajo
 * del campo, apenas se pierde el foco. */
@Injectable()
export class VerificarDireccionUseCase {
  constructor(private readonly geocodificacion: GeocodificacionPort) {}

  async execute(
    command: VerificarDireccionCommand,
  ): Promise<VerificarDireccionResultado> {
    const coordenadas = await this.geocodificacion.geocodificar(
      command.direccion,
      command.ciudad,
      command.departamento,
    );

    return {
      direccionResuelta: coordenadas?.direccionResuelta ?? null,
      precisa: coordenadas?.precisa ?? true,
      candidatos: coordenadas?.candidatos ?? [],
    };
  }
}
