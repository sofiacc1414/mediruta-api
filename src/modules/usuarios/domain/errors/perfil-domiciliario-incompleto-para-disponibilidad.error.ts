/** El Domiciliario intentó activar "Disponible para recibir pedidos"
 * sin haber guardado todavía ningún dato de su perfil (dirección,
 * tipo de vehículo) — `actualizar_disponibilidad_domiciliario` hace
 * un UPDATE puro sobre `perfil_domiciliario`, así que si esa fila no
 * existe aún, no hay dónde guardar la disponibilidad. No es un
 * problema de rol (el Domiciliario sí tiene el rol) — antes se
 * reportaba con el mismo mensaje genérico que un guard de rol real. */
export class PerfilDomiciliarioIncompletoParaDisponibilidadError extends Error {
  constructor() {
    super(
      'Completa tu perfil de domiciliario (dirección y tipo de vehículo) antes de activarte como disponible.',
    );
    this.name = 'PerfilDomiciliarioIncompletoParaDisponibilidadError';
  }
}
