/**
 * POST /api/admin/precios — guarda la configuración del cotizador.
 * Protegido por el middleware (solo administradores). Además exige que la
 * petición venga del mismo sitio.
 */
import type { APIRoute } from 'astro';
import { validarConfigPrecios } from '@/lib/precios/validar';
import type { ConfigPrecios } from '@/lib/precios/tipos';

export const prerender = false;

const responder = (cuerpo: object, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const POST: APIRoute = async ({ request, locals, url }) => {
  const origen = request.headers.get('Origin');
  if (origen && origen !== url.origin) return responder({ ok: false, mensaje: 'Origen no permitido.' }, 403);
  let config: unknown;
  try {
    config = await request.json();
  } catch {
    return responder({ ok: false, mensaje: 'Datos inválidos.' }, 400);
  }
  const v = validarConfigPrecios(config);
  if (!v.ok) return responder({ ok: false, errores: v.errores }, 422);
  try {
    await locals.repoAdmin!.guardarPrecios(config as ConfigPrecios, locals.admin!.correo);
  } catch (e) {
    console.error('[precios]', e instanceof Error ? e.message : e);
    return responder({ ok: false, mensaje: 'No se pudo guardar en la base de datos.' }, 502);
  }
  return responder({ ok: true });
};
