import { describe, expect, it } from 'vitest';
import { correoClienteRecibido, correoDuenoNuevo, escapar } from './plantillas';
import { aBase64 } from './correo';

describe('plantillas de correo', () => {
  it('escapa HTML en los datos del cliente', () => {
    expect(escapar('<script>"x"&\'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;');
    const c = correoDuenoNuevo({
      codigo: 'SR-AAAAA-BBBBB',
      tipo: 'Cotización',
      nombre: '<b>Ana</b>',
      correoCliente: 'ana@ejemplo.co',
      enlaceWhatsApp: 'https://wa.me/573001234567?text=hola',
      filas: [['Nota', '<img src=x onerror=alert(1)>']],
    });
    expect(c.html).not.toContain('<img src=x');
    expect(c.html).toContain('https://wa.me/573001234567');
    expect(c.texto).toContain('Nota: <img');
  });

  it('el acuse de cotización aclara que el precio es estimado', () => {
    const c = correoClienteRecibido({ nombre: 'Ana', codigo: 'SR-1', tipo: 'x', filas: [], esCotizacion: true });
    expect(c.texto).toMatch(/precio estimado/i);
    expect(c.asunto).toContain('SR-1');
  });

  it('codifica adjuntos en base64 sin Buffer', () => {
    expect(aBase64(new TextEncoder().encode('hola'))).toBe('aG9sYQ==');
  });
});

describe('correos de seguimiento', () => {
  it('invita a aprobar cuando la cotización está lista y escapa el mensaje', async () => {
    const { correoClienteActualizacion } = await import('./plantillas');
    const c = correoClienteActualizacion({
      nombre: 'Ana',
      codigo: 'SR-AAAAA-BBBBB',
      estadoTitulo: 'Cotizada',
      estadoTexto: 'Tu cotización está lista.',
      mensaje: '<b>Incluye lijado</b>',
      precio: '$ 35.000',
      diasEntrega: 3,
      enlacePago: 'https://pago.ejemplo/abc',
      enlaceSeguimiento: 'https://sitio.co/pedido/SR-AAAAA-BBBBB',
      puedeAprobar: true,
    });
    expect(c.html).toContain('Revisar y aprobar la cotización');
    expect(c.html).toContain('https://pago.ejemplo/abc');
    expect(c.html).not.toContain('<b>Incluye');
    expect(c.texto).toContain('Seguimiento: https://sitio.co/pedido/SR-AAAAA-BBBBB');
  });
});
