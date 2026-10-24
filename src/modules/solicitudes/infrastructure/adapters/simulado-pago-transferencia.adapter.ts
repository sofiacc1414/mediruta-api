import { Injectable } from '@nestjs/common';
import {
  PagoTransferenciaPort,
  ResultadoPagoTransferencia,
} from '../../domain/ports/pago-transferencia.port';

@Injectable()
export class SimuladoPagoTransferenciaAdapter extends PagoTransferenciaPort {
  // A diferencia de tarjeta (que tiene un número de prueba para forzar
  // el rechazo, `4000000000000002`), una transferencia no tiene ningún
  // dato que se preste para simular ese caso — no hay integración real
  // con ningún procesador, así que siempre se aprueba.
  async procesar(_monto: number): Promise<ResultadoPagoTransferencia> {
    return 'aprobado';
  }
}
