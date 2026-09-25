import {
  contenidoAsignacion,
  contenidoCambioEstado,
  contenidoCuentaAprobada,
  contenidoCuentaRechazada,
  sellar,
} from './contenido-notificacion';

describe('contenido de notificaciones (G05)', () => {
  it('el pedido aceptado no incluye el código ni un número largo', () => {
    const aviso = contenidoCambioEstado('asignado_en_camino_farmacia');
    expect(aviso.titulo).toBe('Pedido aceptado');
    expect(aviso.mensaje).toBe(
      'Un domiciliario aceptó tu pedido y realizará la entrega.',
    );
    expect(aviso.mensaje).not.toMatch(/\d{6,}/);
  });

  it('en farmacia, en camino y entregado usan el texto fijo', () => {
    expect(contenidoCambioEstado('en_farmacia')).toEqual({
      titulo: 'Pedido en proceso',
      mensaje: 'Tu pedido está siendo preparado para continuar con la entrega.',
    });
    expect(contenidoCambioEstado('en_camino_entrega').titulo).toBe(
      'Pedido en camino',
    );
    expect(contenidoCambioEstado('entregado').mensaje).toBe(
      'Tu pedido fue entregado correctamente.',
    );
  });

  it('la asignación no incluye datos del paciente ni el código del pedido', () => {
    const aviso = contenidoAsignacion();
    expect(aviso.titulo).toBe('Nuevo pedido asignado');
    expect(aviso.mensaje).toContain('nuevo pedido disponible');
    expect(aviso.mensaje).not.toMatch(/\d/);
  });

  it('la cuenta aprobada y la rechazada usan el texto fijo', () => {
    expect(contenidoCuentaAprobada().titulo).toBe('Cuenta aprobada');
    expect(contenidoCuentaRechazada().mensaje).toBe(
      'Tu solicitud de registro no fue aprobada.',
    );
  });

  it('rechaza un mensaje con documento o un número largo', () => {
    expect(() =>
      sellar({ titulo: 'Aviso', mensaje: 'Mira la receta adjunta' }),
    ).toThrow(/no se puede enviar/);
    expect(() =>
      sellar({ titulo: 'Aviso', mensaje: 'Cédula 1234567890' }),
    ).toThrow();
  });
});
