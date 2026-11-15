/**
 * POST /api/contacto
 * Formularios de contacto general y empresarial (B2B), con adjuntos opcionales.
 * Campo `tipo`: "contacto" | "empresa".
 */
import type { APIRoute } from 'astro';
import { REGLAS_ADJUNTOS, texto, validarArchivos, validarEmpresa, type Errores } from '@/lib/solicitudes/validacion';
import { TIPOS_SOLICITUD } from '@/lib/solicitudes/tipos';
import { json, leerFormulario, notificar, prepararContexto } from '@/lib/servidor/formularios';
import type { Filas } from '@/lib/servidor/plantillas';

export const prerender = false;

const SERVICIOS: Record<string, string> = {
  impresion: 'Impresión 3D',
  diseno: 'Diseño CAD',
  robotica: 'Robótica',
  electronica: 'Electrónica',
  empresa: 'Repuestos o piezas para empresa',
  educacion: 'Talleres o educación',
  otro: 'Aún no lo sé',
};

export const POST: APIRoute = async ({ request }) => {
  const form = await leerFormulario(request);
  if (form instanceof Response) return form;

  const tipo = form.campos.tipo === 'empresa' ? 'empresa' : 'contacto';
  const errores: Errores = {};
  const mensaje = texto(form.campos.mensaje, 4000);
  const adjuntos = form.archivos.adjuntos ?? [];
  const errorAdjuntos = validarArchivos(adjuntos, REGLAS_ADJUNTOS);
  if (errorAdjuntos) errores.adjuntos = errorAdjuntos;

  let filas: Filas;
  if (tipo === 'empresa') {
    const empresa = validarEmpresa(form.campos);
    Object.assign(errores, empresa.errores);
    if (mensaje.length < 10) errores.mensaje = 'Describe la pieza o el problema (mínimo 10 caracteres).';
    const e = empresa.datos;
    filas = [
      ['Empresa', e.empresa],
      ['NIT', e.nit ?? 'No indicado'],
      ['Sector', e.sector ?? 'No indicado'],
      ['Tipo de pieza o servicio', e.tipoPieza ?? 'No indicado'],
      ['Cantidad', e.cantidad ?? 'No indicada'],
      ['Urgencia', e.urgencia ?? 'No indicada'],
      ['Descripción', mensaje],
    ];
    if (e.razonSocial || e.correoFacturacion || e.direccionFacturacion) {
      filas.push(
        ['Razón social (facturación)', e.razonSocial ?? '—'],
        ['Correo de facturación', e.correoFacturacion ?? '—'],
        ['Dirección de facturación', e.direccionFacturacion ?? '—'],
      );
    }
  } else {
    if (mensaje.length < 10) errores.mensaje = 'Cuéntanos un poco más (mínimo 10 caracteres).';
    const servicio = SERVICIOS[texto(form.campos.servicio)] ?? SERVICIOS.otro!;
    filas = [
      ['Servicio', servicio],
      ['Mensaje', mensaje],
    ];
  }
  if (adjuntos.length) filas.push(['Adjuntos', adjuntos.map((a) => a.name).join(', ')]);

  const ctx = await prepararContexto(form, request, errores);
  if (ctx instanceof Response) return ctx;

  const r = await notificar(ctx, {
    tipo: TIPOS_SOLICITUD[tipo],
    esCotizacion: false,
    filasCliente: filas,
    filasDueno: [['Código', ctx.codigo], ...filas],
    archivos: adjuntos,
  });
  return json(r, r.ok ? 200 : 502);
};

export const ALL: APIRoute = () => json({ ok: false, mensaje: 'Método no permitido.' }, 405);
