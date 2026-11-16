/**
 * Destino del enlace mágico. Acepta los dos formatos de Supabase:
 * - ?token_hash=…&type=… (recomendado: funciona aunque el enlace se abra en otro navegador)
 * - ?code=… (flujo PKCE: debe abrirse en el mismo navegador donde se pidió)
 */
import type { APIRoute } from 'astro';
import type { EmailOtpType } from '@supabase/supabase-js';
import { entorno } from '@/lib/servidor/entorno';
import { repositorioPublico } from '@/lib/datos';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const env = entorno();
  const db = locals.supabase;
  if (!env.supabase || !db) return redirect('/admin');

  const tokenHash = url.searchParams.get('token_hash');
  const tipo = url.searchParams.get('type') as EmailOtpType | null;
  const codigo = url.searchParams.get('code');

  let fallo = true;
  if (tokenHash && tipo) fallo = Boolean((await db.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error);
  else if (codigo) fallo = Boolean((await db.auth.exchangeCodeForSession(codigo)).error);
  if (fallo) return redirect('/admin/ingresar?error=enlace');

  const { data } = await db.auth.getUser();
  const correo = data.user?.email?.toLowerCase();
  if (!correo || !env.adminCorreos.includes(correo)) {
    await db.auth.signOut();
    return redirect('/admin/ingresar?error=no-autorizado');
  }

  // La tabla de administradores (que usa RLS) queda igual a ADMIN_EMAILS.
  try {
    await repositorioPublico().sincronizarAdministradores(env.adminCorreos);
  } catch (e) {
    console.error('[administradores]', e instanceof Error ? e.message : e);
  }
  return redirect('/admin');
};
