import { Injectable } from '@nestjs/common';
import {
  PagoTarjetaPort,
  ResultadoPagoTarjeta,
} from '../../domain/ports/pago-tarjeta.port';

/** Convención de tarjetas de prueba (mismo criterio que Stripe) — un
 * único número reservado para forzar el rechazo, cualquier otro
 * número con formato válido se aprueba. No hay integración real con
 * ningún procesador: `monto` ni siquiera se usa, solo está en la
 * firma del puerto para cuando algún día exista una pasarela real. */
const TARJETA_RECHAZO = '4000000000000002';

@Injectable()
export class SimuladoPagoTarjetaAdapter extends PagoTarjetaPort {
  async procesar(
    numeroTarjeta: string,
    _monto: number,
  ): Promise<ResultadoPagoTarjeta> {
    const limpio = numeroTarjeta.replace(/\s|-/g, '');
    return limpio === TARJETA_RECHAZO ? 'rechazado' : 'aprobado';
  }
}
