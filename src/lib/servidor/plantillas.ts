/**
 * Plantillas de correo (HTML con estilos en línea + versión de texto plano).
 * Puras: reciben datos y devuelven { asunto, html, texto }.
 */
import { marca } from '@/config/marca';

export type Filas = [string, string][];

export function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tabla(filas: Filas): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:15px">
${filas
  .map(
    ([k, v]) =>
      `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid #C9D0D9;color:#5C6675;vertical-align:top;width:40%">${escapar(k)}</td><td style="padding:8px 0;border-bottom:1px solid #C9D0D9;color:#10151C;font-weight:600;white-space:pre-wrap">${escapar(v)}</td></tr>`,
  )
  .join('\n')}
</table>`;
}

function boton(texto: string, href: string, fondo = '#FF6A13', color = '#10151C'): string {
  return `<a href="${escapar(href)}" style="display:inline-block;padding:14px 22px;background:${fondo};color:${color};font-weight:700;text-decoration:none;border-radius:3px">${escapar(texto)}</a>`;
}

function marco(titulo: string, cuerpo: string): string {
  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapar(titulo)}</title></head>
<body style="margin:0;background:#F7F8FA;font-family:Arial,Helvetica,sans-serif;color:#1A1F26;line-height:1.55">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#16325C;color:#F2F5F9;padding:18px 24px;font-size:18px;font-weight:700;letter-spacing:.02em">${escapar(marca.nombre)}</div>
<div style="background:#FFFFFF;border:1px solid #C9D0D9;border-top:0;padding:24px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#10151C">${escapar(titulo)}</h1>
${cuerpo}
</div>
<p style="font-size:13px;color:#5C6675;margin:16px 0 0">${escapar(marca.nombre)} · ${escapar(marca.ubicacion.ciudad)}, ${escapar(marca.ubicacion.region)} · ${escapar(marca.contacto.correo)}</p>
</div></body></html>`;
}

function textoPlano(titulo: string, parrafos: string[], filas: Filas = []): string {
  return [titulo, '', ...parrafos, '', ...filas.map(([k, v]) => `${k}: ${v}`), '', `— ${marca.nombre}`].join('\n');
}

const avisoDemo = `<p style="padding:10px 12px;background:#FDF0D9;border-left:4px solid #C98A00;font-size:14px">Mensaje de prueba generado en MODO DEMO.</p>`;

export function correoClienteRecibido(d: {
  nombre: string;
  codigo: string;
  tipo: string;
  filas: Filas;
  enlaceSeguimiento?: string;
  esCotizacion: boolean;
  preciosDemo?: boolean;
}) {
  const titulo = d.esCotizacion ? `Recibimos tu cotización ${d.codigo}` : `Recibimos tu solicitud ${d.codigo}`;
  const parrafos = [
    `Hola ${d.nombre}, gracias por escribirnos.`,
    d.esCotizacion
      ? 'Este es un precio estimado: lo confirmamos al revisar tu archivo. Te escribiremos con el valor final y el plazo antes de fabricar nada.'
      : 'Revisaremos tu solicitud y te responderemos con una propuesta. Nada se fabrica sin tu aprobación.',
    `Tu número de referencia es ${d.codigo}. Guárdalo para cualquier consulta.`,
  ];
  const cuerpo = `${d.preciosDemo ? avisoDemo : ''}
${parrafos.map((p) => `<p style="margin:0 0 12px">${escapar(p)}</p>`).join('\n')}
${tabla(d.filas)}
${d.enlaceSeguimiento ? `<p style="margin:24px 0 0">${boton('Ver el estado de mi pedido', d.enlaceSeguimiento)}</p>` : ''}
<p style="margin:24px 0 0;font-size:14px;color:#3D4652">Si tienes dudas, responde a este correo.</p>`;
  return {
    asunto: `${titulo} · ${marca.nombre}`,
    html: marco(titulo, cuerpo),
    texto: textoPlano(titulo, [...parrafos, d.enlaceSeguimiento ? `Seguimiento: ${d.enlaceSeguimiento}` : ''], d.filas),
  };
}

export function correoDuenoNuevo(d: {
  codigo: string;
  tipo: string;
  nombre: string;
  filas: Filas;
  enlaceWhatsApp: string | null;
  correoCliente: string;
  notaAdjuntos?: string;
}) {
  const titulo = `Nueva ${d.tipo.toLowerCase()} · ${d.codigo}`;
  const botones = [
    d.enlaceWhatsApp ? boton(`Escribir a ${d.nombre} por WhatsApp`, d.enlaceWhatsApp, '#1D6B3A', '#FFFFFF') : '',
    boton('Responder por correo', `mailto:${d.correoCliente}?subject=${encodeURIComponent(`${marca.nombre} · ${d.codigo}`)}`, '#16325C', '#F2F5F9'),
  ]
    .filter(Boolean)
    .join('&nbsp; ');
  const cuerpo = `<p style="margin:0 0 16px">${botones}</p>
${tabla(d.filas)}
${d.notaAdjuntos ? `<p style="margin:16px 0 0;font-size:14px;color:#3D4652">${escapar(d.notaAdjuntos)}</p>` : ''}`;
  return {
    asunto: titulo,
    html: marco(titulo, cuerpo),
    texto: textoPlano(titulo, [d.enlaceWhatsApp ? `WhatsApp: ${d.enlaceWhatsApp}` : `Correo: ${d.correoCliente}`, d.notaAdjuntos ?? ''], d.filas),
  };
}
