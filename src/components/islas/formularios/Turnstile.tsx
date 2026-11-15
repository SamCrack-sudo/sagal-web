/**
 * Widget de Cloudflare Turnstile. Si no hay PUBLIC_TURNSTILE_SITE_KEY (modo demo)
 * no se muestra nada y el servidor omite la verificación.
 */
import { useEffect, useRef } from 'react';
import { PUBLIC_TURNSTILE_SITE_KEY } from 'astro:env/client';

interface ApiTurnstile {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile;
  }
}

let carga: Promise<void> | null = null;

function cargarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  carga ??= new Promise((resolver, rechazar) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolver();
    s.onerror = () => {
      carga = null;
      rechazar(new Error('No se pudo cargar Turnstile'));
    };
    document.head.appendChild(s);
  });
  return carga;
}

export const turnstileActivo = Boolean(PUBLIC_TURNSTILE_SITE_KEY);

export function Turnstile({ reinicio = 0, tema = 'light' }: { reinicio?: number; tema?: 'light' | 'dark' }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);

  useEffect(() => {
    if (!PUBLIC_TURNSTILE_SITE_KEY || !ref.current) return;
    let cancelado = false;
    cargarScript()
      .then(() => {
        if (cancelado || !ref.current || !window.turnstile) return;
        // El widget agrega el campo oculto "cf-turnstile-response" al formulario.
        id.current = window.turnstile.render(ref.current, {
          sitekey: PUBLIC_TURNSTILE_SITE_KEY,
          language: 'es',
          theme: tema,
          appearance: 'interaction-only',
        });
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [tema]);

  useEffect(() => {
    if (reinicio > 0 && id.current && window.turnstile) window.turnstile.reset(id.current);
  }, [reinicio]);

  if (!PUBLIC_TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="turnstile" />;
}
