/**
 * Métricas del resumen del panel, calculadas a partir de filas simples.
 * Puras: reciben los datos y la fecha actual, para poder probarlas.
 * Las fechas de calendario (mes) se toman en hora de Colombia (UTC−5, sin horario de verano).
 */
import { ESTADOS, yaAprobado, type Estado } from './estados';
import type { OrigenVisita } from '@/lib/solicitudes/tipos';

export interface FilaMetrica {
  tipo: string;
  estado: Estado;
  creadoEn: string;
  pagadoEn: string | null;
  precioFinal: number | null;
  precioEstimado: number | null;
  origen: OrigenVisita | null;
}

export interface Resumen {
  cotizaciones7d: number;
  cotizaciones7dAnterior: number;
  conversion: { cotizaciones: number; aprobadas: number; tasa: number | null };
  ingresosMes: number;
  pagadosMes: number;
  ticketPromedio: number | null;
  enProduccion: number;
  porEstado: Record<Estado, number>;
  origenes: { canal: string; cantidad: number }[];
}

const DIA = 86_400_000;
const OFFSET_COLOMBIA = -5 * 3_600_000;

/** Tipos que cuentan como cotización (pueden convertirse en pedido). */
const TIPOS_COTIZABLES = new Set(['cotizacion', 'diseno_cad', 'empresa']);

/** Inicio del mes calendario en Colombia, como instante UTC. */
export function inicioMesColombia(ahora: Date): Date {
  const local = new Date(ahora.getTime() + OFFSET_COLOMBIA);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET_COLOMBIA);
}

const NOMBRES_CANAL: [RegExp, string][] = [
  [/^(ig|insta(gram)?)$/, 'Instagram'],
  [/^(fb|facebook|meta)$/, 'Facebook'],
  [/^(wa|whatsapp)$/, 'WhatsApp'],
  [/^(google|adwords|gads)$/, 'Google'],
  [/^(ml|mercadolibre|mercado_libre)$/, 'MercadoLibre'],
  [/^(tiktok|tt)$/, 'TikTok'],
  [/^(linkedin|li)$/, 'LinkedIn'],
];

const DOMINIOS_CANAL: [RegExp, string][] = [
  [/(^|\.)google\./, 'Google (búsqueda)'],
  [/(^|\.)bing\.com$/, 'Bing (búsqueda)'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com)$/, 'Facebook'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
  [/(^|\.)mercadolibre\.com/, 'MercadoLibre'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
];

/** Traduce el origen guardado (UTM o referente) a un canal legible. */
export function canalDeOrigen(origen: OrigenVisita | null | undefined): string {
  const fuente = origen?.utm_source?.trim().toLowerCase();
  if (fuente) {
    for (const [re, nombre] of NOMBRES_CANAL) if (re.test(fuente)) return nombre;
    return fuente.charAt(0).toUpperCase() + fuente.slice(1);
  }
  if (origen?.gclid) return 'Google (anuncios)';
  if (origen?.referente) {
    try {
      const host = new URL(origen.referente).hostname.replace(/^www\./, '');
      for (const [re, nombre] of DOMINIOS_CANAL) if (re.test(host)) return nombre;
      return host;
    } catch {
      return 'Otro sitio';
    }
  }
  return 'Directo';
}

export function calcularResumen(filas: FilaMetrica[], ahora: Date): Resumen {
  const t = ahora.getTime();
  const hace7 = t - 7 * DIA;
  const hace14 = t - 14 * DIA;
  const hace30 = t - 30 * DIA;
  const hace90 = t - 90 * DIA;
  const mes = inicioMesColombia(ahora).getTime();

  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<Estado, number>;
  let cotizaciones7d = 0;
  let cotizaciones7dAnterior = 0;
  let cot30 = 0;
  let apr30 = 0;
  let ingresosMes = 0;
  let pagadosMes = 0;
  const canales = new Map<string, number>();

  for (const f of filas) {
    const creado = Date.parse(f.creadoEn);
    porEstado[f.estado] += 1;

    if (TIPOS_COTIZABLES.has(f.tipo)) {
      if (creado >= hace7) cotizaciones7d += 1;
      else if (creado >= hace14) cotizaciones7dAnterior += 1;
      if (creado >= hace30 && f.estado !== 'cancelado') {
        cot30 += 1;
        if (yaAprobado(f.estado)) apr30 += 1;
      }
    }

    if (f.pagadoEn && Date.parse(f.pagadoEn) >= mes) {
      ingresosMes += f.precioFinal ?? f.precioEstimado ?? 0;
      pagadosMes += 1;
    }

    if (creado >= hace90) {
      const canal = canalDeOrigen(f.origen);
      canales.set(canal, (canales.get(canal) ?? 0) + 1);
    }
  }

  return {
    cotizaciones7d,
    cotizaciones7dAnterior,
    conversion: { cotizaciones: cot30, aprobadas: apr30, tasa: cot30 ? apr30 / cot30 : null },
    ingresosMes,
    pagadosMes,
    ticketPromedio: pagadosMes ? ingresosMes / pagadosMes : null,
    enProduccion: porEstado.en_produccion,
    porEstado,
    origenes: [...canales.entries()]
      .map(([canal, cantidad]) => ({ canal, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.canal.localeCompare(b.canal, 'es')),
  };
}
