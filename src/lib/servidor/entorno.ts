/**
 * Acceso a secretos del servidor y detección de los MODOS DEMO.
 * Solo se importa desde código de servidor; nunca desde el navegador.
 *
 * Hay dos interruptores independientes:
 * - Correo (Resend): sin RESEND_API_KEY no se envían correos.
 * - Datos (Supabase): sin SUPABASE_* se usa un almacén de demostración en memoria.
 */
import { getSecret } from 'astro:env/server';
import { marca } from '@/config/marca';

function secreto(nombre: string): string | undefined {
  const v = getSecret(nombre);
  return v && v.trim() ? v.trim() : undefined;
}

/** Convierte "a@x.co, b@y.co" en una lista normalizada. */
export function listaCorreos(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(/[\s,;]+/)
    .map((c) => c.trim().toLowerCase())
    .filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));
}

export function entorno() {
  const resendApiKey = secreto('RESEND_API_KEY');
  const turnstileSecreto = secreto('TURNSTILE_SECRET_KEY');
  const url = secreto('SUPABASE_URL');
  const anon = secreto('SUPABASE_ANON_KEY');
  const servicio = secreto('SUPABASE_SERVICE_ROLE_KEY');
  return {
    resendApiKey,
    remitente: secreto('RESEND_FROM') ?? `${marca.nombre} <onboarding@resend.dev>`,
    correoDueno: secreto('OWNER_EMAIL') ?? marca.contacto.correo,
    turnstileSecreto,
    /** Sin servicio de correo no hay a dónde enviar avisos: modo demo de correo. */
    demo: !resendApiKey,
    supabase: url && anon && servicio ? { url, anon, servicio } : null,
    adminCorreos: listaCorreos(secreto('ADMIN_EMAILS')),
  };
}

export type Entorno = ReturnType<typeof entorno>;
