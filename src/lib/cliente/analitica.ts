/**
 * Adaptador de analítica. Apagado por defecto: solo se activa si
 * PUBLIC_ANALYTICS_PROVIDER es "ga4" o "plausible" y hay PUBLIC_ANALYTICS_ID.
 * El resto del sitio solo llama a `registrarEvento`, sin saber qué proveedor hay.
 */
import { PUBLIC_ANALYTICS_PROVIDER, PUBLIC_ANALYTICS_ID } from 'astro:env/client';

export type EventoConversion =
  | 'clic_cta_cotizar'
  | 'clic_whatsapp'
  | 'cotizacion_inicio'
  | 'cotizacion_archivo_cargado'
  | 'cotizacion_envio'
  | 'solicitud_cad_envio'
  | 'formulario_envio'
  | 'suscripcion';

type Propiedades = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: ((evento: string, opciones?: { props?: Propiedades }) => void) & { q?: unknown[] };
  }
}

const proveedor = PUBLIC_ANALYTICS_ID ? PUBLIC_ANALYTICS_PROVIDER : 'ninguno';

let iniciada = false;

export function iniciarAnalitica(): void {
  if (iniciada || typeof window === 'undefined') return;
  iniciada = true;

  if (proveedor === 'ga4' && PUBLIC_ANALYTICS_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // GA4 exige el objeto `arguments`, no un arreglo.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', PUBLIC_ANALYTICS_ID, { anonymize_ip: true });
    cargarScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(PUBLIC_ANALYTICS_ID)}`);
  }

  if (proveedor === 'plausible' && PUBLIC_ANALYTICS_ID) {
    const cola: unknown[] = [];
    window.plausible = Object.assign(
      (...args: unknown[]) => {
        cola.push(args);
      },
      { q: cola },
    ) as Window['plausible'];
    cargarScript('https://plausible.io/js/script.tagged-events.js', { 'data-domain': PUBLIC_ANALYTICS_ID });
  }
}

function cargarScript(src: string, atributos: Record<string, string> = {}) {
  const s = document.createElement('script');
  s.async = true;
  s.defer = true;
  s.src = src;
  for (const [k, v] of Object.entries(atributos)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

export function registrarEvento(nombre: EventoConversion, propiedades: Propiedades = {}): void {
  if (typeof window === 'undefined') return;
  const limpias = Object.fromEntries(Object.entries(propiedades).filter(([, v]) => v !== undefined));

  if (proveedor === 'ga4') window.gtag?.('event', nombre, limpias);
  else if (proveedor === 'plausible') window.plausible?.(nombre, { props: limpias as Propiedades });
  else if (import.meta.env.DEV) console.debug('[analítica]', nombre, limpias);
}
