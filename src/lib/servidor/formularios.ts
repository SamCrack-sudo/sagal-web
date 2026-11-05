/**
 * Utilidades comunes de las rutas de API que reciben formularios.
 */
import { marca, enlaceWhatsApp } from '@/config/marca';
import { TIPOS_CLIENTE, type DatosContacto, type OrigenVisita, type RespuestaSolicitud } from '@/lib/solicitudes/tipos';
import { esSpam, normalizarTelefono, validarContacto, type Errores } from '@/lib/solicitudes/validacion';
import { generarCodigo } from '@/lib/solicitudes/codigo';
import { verificarTurnstile } from './turnstile';
import { entorno } from './entorno';
import { aBase64, enviarCorreo, type Adjunto } from './correo';
import { correoClienteRecibido, correoDuenoNuevo, type Filas } from './plantillas';

/** Límite del cuerpo de la petición (los Workers gratuitos aceptan hasta 100 MB). */
export const TAM_MAX_PETICION = 80 * 1024 * 1024;
/** Límite de adjuntos por correo (Resend acepta ~40 MB en total tras codificar en base64). */
const TAM_MAX_ADJUNTOS = 20 * 1024 * 1024;

export function json(cuerpo: RespuestaSolicitud, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export interface Formulario {
  campos: Record<string, string>;
  archivos: Record<string, File[]>;
}

export async function leerFormulario(request: Request): Promise<Formulario | Response> {
  const largo = Number(request.headers.get('content-length') ?? 0);
  if (largo > TAM_MAX_PETICION) {
    return json({ ok: false, mensaje: 'Los archivos superan el tamaño máximo permitido.' }, 413);
  }
  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return json({ ok: false, mensaje: 'No pudimos leer el formulario.' }, 400);
  }
  const campos: Record<string, string> = {};
  const archivos: Record<string, File[]> = {};
  for (const [clave, valor] of datos.entries()) {
    if (typeof valor === 'string') campos[clave] = valor;
    else if (valor.size > 0) (archivos[clave] ??= []).push(valor);
  }
  return { campos, archivos };
}

export interface Contexto {
  contacto: DatosContacto;
  origen: OrigenVisita | null;
  codigo: string;
  env: ReturnType<typeof entorno>;
}

/**
 * Comprueba antispam (campo trampa + Turnstile) y valida los datos de contacto.
 * Devuelve una Response si hay que cortar el flujo.
 */
export async function prepararContexto(
  form: Formulario,
  request: Request,
  erroresExtra: Errores = {},
): Promise<Contexto | Response> {
  const env = entorno();
  const codigo = generarCodigo(marca.prefijo);

  // Bots: se responde "ok" sin hacer nada, para no darles pistas.
  if (esSpam(form.campos)) return json({ ok: true, codigo });

  const turnstile = await verificarTurnstile(
    form.campos['cf-turnstile-response'] ?? null,
    env.turnstileSecreto,
    request.headers.get('CF-Connecting-IP'),
  );
  if (!turnstile.ok) {
    return json({ ok: false, mensaje: 'No pudimos verificar que no eres un robot. Recarga la página e inténtalo de nuevo.' }, 400);
  }

  const { datos, errores } = validarContacto(form.campos);
  const todos = { ...errores, ...erroresExtra };
  if (Object.keys(todos).length > 0) {
    return json({ ok: false, mensaje: 'Revisa los campos marcados.', errores: todos }, 422);
  }

  let origen: OrigenVisita | null = null;
  try {
    const crudo = JSON.parse(form.campos.origen ?? 'null') as { primero?: OrigenVisita; sesion?: OrigenVisita } | null;
    origen = crudo?.sesion ?? crudo?.primero ?? null;
  } catch {
    origen = null;
  }

  return { contacto: datos, origen, codigo, env };
}

export function filasContacto(c: DatosContacto): Filas {
  const filas: Filas = [
    ['Nombre', c.nombre],
    ['Correo', c.correo],
    ['Tipo de cliente', TIPOS_CLIENTE[c.tipoCliente]],
  ];
  if (c.telefono) filas.push(['Teléfono / WhatsApp', c.telefono]);
  if (c.ciudad) filas.push(['Ciudad', c.ciudad]);
  return filas;
}

export function filasOrigen(o: OrigenVisita | null): Filas {
  if (!o) return [['Origen', 'Directo / sin datos']];
  const filas: Filas = [];
  if (o.utm_source) filas.push(['utm_source', o.utm_source]);
  if (o.utm_medium) filas.push(['utm_medium', o.utm_medium]);
  if (o.utm_campaign) filas.push(['utm_campaign', o.utm_campaign]);
  if (o.utm_term) filas.push(['utm_term', o.utm_term]);
  if (o.utm_content) filas.push(['utm_content', o.utm_content]);
  if (o.gclid) filas.push(['gclid', o.gclid]);
  if (o.referente) filas.push(['Referente', o.referente]);
  if (o.llegada) filas.push(['Página de llegada', o.llegada]);
  return filas.length ? filas : [['Origen', 'Directo']];
}

export async function prepararAdjuntos(archivos: File[]): Promise<{ adjuntos: Adjunto[]; omitidos: string[] }> {
  const adjuntos: Adjunto[] = [];
  const omitidos: string[] = [];
  let total = 0;
  for (const a of archivos) {
    if (total + a.size > TAM_MAX_ADJUNTOS) {
      omitidos.push(a.name);
      continue;
    }
    total += a.size;
    adjuntos.push({ filename: a.name.replace(/[^\w.\- ()áéíóúñÁÉÍÓÚÑ]/g, '_'), content: aBase64(new Uint8Array(await a.arrayBuffer())) });
  }
  return { adjuntos, omitidos };
}

/**
 * Envía el acuse al cliente y el aviso al dueño. En modo demo no envía nada.
 * Fase 2: además se guardará la solicitud en Supabase (y los archivos en Storage).
 */
export async function notificar(
  ctx: Contexto,
  d: {
    tipo: string;
    esCotizacion: boolean;
    filasCliente: Filas;
    filasDueno: Filas;
    archivos: File[];
    preciosDemo?: boolean;
    enlaceSeguimiento?: string;
  },
): Promise<RespuestaSolicitud> {
  if (ctx.env.demo || !ctx.env.resendApiKey) {
    return {
      ok: true,
      demo: true,
      codigo: ctx.codigo,
      mensaje: 'Modo demostración: la solicitud se validó, pero no se envió ni se guardó.',
    };
  }

  const { adjuntos, omitidos } = await prepararAdjuntos(d.archivos);
  const telefono = ctx.contacto.telefono ? normalizarTelefono(ctx.contacto.telefono) : '';
  const whatsapp = telefono
    ? enlaceWhatsApp(
        `Hola ${ctx.contacto.nombre}, te escribo de ${marca.nombre} por tu solicitud ${ctx.codigo}.`,
        telefono,
      )
    : null;

  const config = { apiKey: ctx.env.resendApiKey, remitente: ctx.env.remitente };
  const aviso = correoDuenoNuevo({
    codigo: ctx.codigo,
    tipo: d.tipo,
    nombre: ctx.contacto.nombre,
    correoCliente: ctx.contacto.correo,
    enlaceWhatsApp: whatsapp,
    filas: [...d.filasDueno, ...filasContacto(ctx.contacto), ...filasOrigen(ctx.origen)],
    notaAdjuntos: omitidos.length
      ? `No se adjuntaron por tamaño: ${omitidos.join(', ')}. Pídeselos al cliente.`
      : undefined,
  });
  const envioDueno = await enviarCorreo(
    { para: ctx.env.correoDueno, asunto: aviso.asunto, html: aviso.html, texto: aviso.texto, responderA: ctx.contacto.correo, adjuntos },
    config,
  );
  if (!envioDueno.ok) {
    console.error('[correo dueño]', envioDueno.error);
    return { ok: false, mensaje: `No pudimos registrar tu solicitud. Escríbenos a ${marca.contacto.correo}.` };
  }

  const acuse = correoClienteRecibido({
    nombre: ctx.contacto.nombre,
    codigo: ctx.codigo,
    tipo: d.tipo,
    filas: d.filasCliente,
    esCotizacion: d.esCotizacion,
    preciosDemo: d.preciosDemo,
    enlaceSeguimiento: d.enlaceSeguimiento,
  });
  const envioCliente = await enviarCorreo(
    { para: ctx.contacto.correo, asunto: acuse.asunto, html: acuse.html, texto: acuse.texto, responderA: ctx.env.correoDueno },
    config,
  );
  // Si falla solo el acuse, la solicitud ya quedó registrada en el correo del dueño.
  if (!envioCliente.ok) console.error('[correo cliente]', envioCliente.error);

  return { ok: true, codigo: ctx.codigo };
}
