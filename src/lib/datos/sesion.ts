/**
 * Cliente de Supabase con la sesión del administrador, guardada en cookies.
 * Se crea uno nuevo en cada petición (requisito de @supabase/ssr).
 */
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function clienteConSesion(
  peticion: { request: Request; cookies: AstroCookies; url: URL },
  cfg: { url: string; anon: string },
) {
  return createServerClient(cfg.url, cfg.anon, {
    cookieOptions: { sameSite: 'lax', secure: peticion.url.protocol === 'https:', path: '/' },
    cookies: {
      getAll() {
        return parseCookieHeader(peticion.request.headers.get('Cookie') ?? '');
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) peticion.cookies.set(name, value, options);
      },
    },
  });
}
