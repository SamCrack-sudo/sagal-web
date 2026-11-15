/**
 * Acceso a secretos del servidor y detección del MODO DEMO.
 * Solo se importa desde rutas de servidor (API); nunca desde el navegador.
 */
import { getSecret } from 'astro:env/server';
import { marca } from '@/config/marca';

function secreto(nombre: string): string | undefined {
  const v = getSecret(nombre);
  return v && v.trim() ? v.trim() : undefined;
}

export function entorno() {
  const resendApiKey = secreto('RESEND_API_KEY');
  const turnstileSecreto = secreto('TURNSTILE_SECRET_KEY');
  return {
    resendApiKey,
    remitente: secreto('RESEND_FROM') ?? `${marca.nombre} <onboarding@resend.dev>`,
    correoDueno: secreto('OWNER_EMAIL') ?? marca.contacto.correo,
    turnstileSecreto,
    /** Sin servicio de correo no hay a dónde enviar las solicitudes: modo demo. */
    demo: !resendApiKey,
  };
}
