/**
 * Envío de correos transaccionales con la API HTTP de Resend (sin SDK, para
 * mantener el Worker liviano).
 */
export interface Adjunto {
  filename: string;
  /** Contenido en base64. */
  content: string;
}

export interface Correo {
  para: string | string[];
  asunto: string;
  html: string;
  texto: string;
  responderA?: string;
  adjuntos?: Adjunto[];
}

export async function enviarCorreo(
  correo: Correo,
  config: { apiKey: string; remitente: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.remitente,
        to: Array.isArray(correo.para) ? correo.para : [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
        reply_to: correo.responderA,
        attachments: correo.adjuntos?.length ? correo.adjuntos : undefined,
      }),
    });
    if (!r.ok) return { ok: false, error: `Resend respondió ${r.status}: ${(await r.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Codifica bytes en base64 sin depender de Buffer (compatible con Workers). */
export function aBase64(bytes: Uint8Array): string {
  let binario = '';
  const bloque = 0x8000;
  for (let i = 0; i < bytes.length; i += bloque) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloque));
  }
  return btoa(binario);
}
