/** HU-07/HU-09 — la cédula del Paciente para reclamar en farmacia solo
 * es visible para el Domiciliario mientras el pedido está en
 * `asignado_en_camino_farmacia` (ya aceptado, todavía no marcó
 * "medicamentos recogidos"). Fuera de esa ventana, o si el pedido no es
 * suyo, se lanza este error — por seguridad/privacidad, no hay motivo
 * legítimo para ver la cédula ajena en ningún otro momento. */
export class DocumentosPacienteNoDisponiblesError extends Error {
  constructor() {
    super(
      'Los documentos del paciente solo están disponibles mientras vas en camino a la farmacia con el pedido ya aceptado.',
    );
    this.name = 'DocumentosPacienteNoDisponiblesError';
  }
}
