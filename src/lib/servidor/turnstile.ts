/**
 * Verificación de Cloudflare Turnstile en el servidor.
 * Si no hay clave secreta configurada (modo demo), la verificación se omite.
 */
const URL_VERIFICACION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verificarTurnstile(
  token: string | null,
  secreto: string | undefined,
  ip: string | null,
): Promise<{ ok: boolean; omitido: boolean }> {
  if (!secreto) return { ok: true, omitido: true };
  if (!token) return { ok: false, omitido: false };
  const cuerpo = new FormData();
  cuerpo.append('secret', secreto);
  cuerpo.append('response', token);
  if (ip) cuerpo.append('remoteip', ip);
  try {
    const r = await fetch(URL_VERIFICACION, { method: 'POST', body: cuerpo });
    const datos = (await r.json()) as { success?: boolean };
    return { ok: Boolean(datos.success), omitido: false };
  } catch {
    return { ok: false, omitido: false };
  }
}
