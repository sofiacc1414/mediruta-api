/** HU-07 (ronda 3) — el admin reenvía por correo el código de entrega
 * vigente de un pedido, cuando el paciente reporta no haberlo visto en
 * la app. Mismo espíritu que `CorreoRecuperacionPort` (usuarios) — el
 * caso de uso depende de este puerto, nunca de Resend directamente. */
export abstract class CorreoCodigoEntregaPort {
  abstract enviarCodigoEntrega(
    correo: string,
    nombrePaciente: string | null,
    codigoPedido: string | null,
    codigoEntrega: string,
  ): Promise<void>;
}
