/**
 * Captura de origen del visitante (UTM, referente, página de llegada).
 * Se guarda el primer contacto (localStorage) y el de la sesión actual
 * (sessionStorage), y se envía con cada solicitud o cotización.
 */
import type { OrigenVisita } from '@/lib/solicitudes/tipos';

const CLAVE_PRIMERO = 'sagal_origen_primero';
const CLAVE_SESION = 'sagal_origen_sesion';
const PARAMETROS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'] as const;

function leer(almacen: Storage | undefined, clave: string): OrigenVisita | null {
  try {
    const crudo = almacen?.getItem(clave);
    return crudo ? (JSON.parse(crudo) as OrigenVisita) : null;
  } catch {
    return null;
  }
}

function escribir(almacen: Storage | undefined, clave: string, valor: OrigenVisita) {
  try {
    almacen?.setItem(clave, JSON.stringify(valor));
  } catch {
    // Almacenamiento bloqueado (modo privado, etc.): se ignora.
  }
}

function almacen(tipo: 'localStorage' | 'sessionStorage'): Storage | undefined {
  try {
    return window[tipo];
  } catch {
    return undefined;
  }
}

export function capturarOrigen(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const utm: Record<string, string> = {};
  for (const p of PARAMETROS) {
    const v = url.searchParams.get(p);
    if (v) utm[p] = v.slice(0, 200);
  }

  let referente = '';
  try {
    if (document.referrer && new URL(document.referrer).host !== url.host) referente = document.referrer.slice(0, 300);
  } catch {
    referente = '';
  }

  const actual: OrigenVisita = {
    ...utm,
    referente: referente || undefined,
    llegada: url.pathname,
    fecha: new Date().toISOString(),
  };

  const sesion = almacen('sessionStorage');
  const local = almacen('localStorage');
  // La sesión solo se sobrescribe si llegan UTM nuevos o aún no existe.
  if (!leer(sesion, CLAVE_SESION) || Object.keys(utm).length > 0) escribir(sesion, CLAVE_SESION, actual);
  if (!leer(local, CLAVE_PRIMERO)) escribir(local, CLAVE_PRIMERO, actual);
}

export function obtenerOrigen(): { primero: OrigenVisita | null; sesion: OrigenVisita | null } {
  if (typeof window === 'undefined') return { primero: null, sesion: null };
  return {
    primero: leer(almacen('localStorage'), CLAVE_PRIMERO),
    sesion: leer(almacen('sessionStorage'), CLAVE_SESION),
  };
}
