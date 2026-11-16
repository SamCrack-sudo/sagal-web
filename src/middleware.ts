/**
 * Protege el panel (/admin y /api/admin). Solo pasan los correos de
 * ADMIN_EMAILS con sesión válida en Supabase. Sin Supabase configurado, el
 * panel abre en MODO DEMO con datos de ejemplo.
 */
import { defineMiddleware } from 'astro:middleware';
import { entorno } from '@/lib/servidor/entorno';
import { clienteConSesion } from '@/lib/datos/sesion';
import { crearRepositorioAdmin } from '@/lib/datos/supabase';
import { repositorioDemo } from '@/lib/datos/demo';

const RUTAS_LIBRES = ['/admin/ingresar', '/admin/auth/confirmar'];

export function esRutaAdmin(ruta: string): boolean {
  return ruta === '/admin' || ruta.startsWith('/admin/') || ruta.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  ctx.locals.admin = null;
  const ruta = ctx.url.pathname.replace(/\/$/, '') || '/';
  if (ctx.isPrerendered || !esRutaAdmin(ruta)) return next();

  const env = entorno();
  if (!env.supabase) {
    ctx.locals.admin = { correo: 'demo@sagal', demo: true };
    ctx.locals.repoAdmin = repositorioDemo;
  } else {
    const db = clienteConSesion(ctx, env.supabase);
    ctx.locals.supabase = db;
    const { data } = await db.auth.getUser();
    const correo = data.user?.email?.toLowerCase();
    if (correo && env.adminCorreos.includes(correo)) {
      ctx.locals.admin = { correo, demo: false };
      ctx.locals.repoAdmin = crearRepositorioAdmin(db);
    } else if (!RUTAS_LIBRES.includes(ruta)) {
      if (ruta.startsWith('/api/admin/')) return new Response('No autorizado', { status: 401 });
      if (correo) await db.auth.signOut();
      return ctx.redirect(`/admin/ingresar${correo ? '?error=no-autorizado' : ''}`);
    }
  }

  const respuesta = await next();
  try {
    respuesta.headers.set('Cache-Control', 'private, no-store');
    respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  } catch {
    // Algunas respuestas (redirecciones) tienen cabeceras inmutables.
  }
  return respuesta;
});
