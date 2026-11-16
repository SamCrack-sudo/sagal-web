/**
 * Formatos compartidos por el panel y la página de seguimiento.
 */
import { ETIQUETA_ESTADO, ESTADO_PARA_CLIENTE } from './estados';
import { formatoNumero } from '@/lib/precios/motor';
import type { ConfigPrecios } from '@/lib/precios/tipos';
import type { Evento, Solicitud } from '@/lib/datos/tipos';

const ZONA = 'America/Bogota';

export function formatoFecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(conHora ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(iso));
}

/** "hace 3 h", "hace 2 días"… para listas del panel. */
export function hace(iso: string, ahora = new Date()): string {
  const min = Math.round((ahora.getTime() - Date.parse(iso)) / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/** Título de un evento del historial, para el panel o para el cliente. */
export function tituloEvento(e: Evento, paraCliente = false): string {
  switch (e.tipo) {
    case 'creada':
      return paraCliente ? 'Recibimos tu solicitud' : 'Solicitud creada';
    case 'estado':
      if (!e.estadoNuevo) return 'Cambio de estado';
      return paraCliente ? ESTADO_PARA_CLIENTE[e.estadoNuevo].titulo : `Estado: ${ETIQUETA_ESTADO[e.estadoNuevo]}`;
    case 'precio':
      return paraCliente ? 'Cotización actualizada' : 'Precio o plazo ajustado';
    case 'nota':
      return paraCliente ? 'Mensaje del taller' : 'Nota interna';
    case 'notificacion':
      return 'Aviso enviado al cliente';
    case 'aprobacion_cliente':
      return paraCliente ? 'Aprobaste la cotización' : 'El cliente aprobó la cotización';
  }
}

/** Resumen legible de las opciones elegidas en el cotizador. */
export function resumenParametros(s: Solicitud, config: ConfigPrecios): [string, string][] {
  const p = s.parametros as Record<string, unknown> | null;
  const m = s.metricas as { tamano?: number[]; volumenMm3?: number } | null;
  const filas: [string, string][] = [];
  if (m?.tamano?.length === 3) filas.push(['Medidas', `${m.tamano.map((n) => formatoNumero(n, 1)).join(' × ')} mm`]);
  if (m?.volumenMm3) filas.push(['Volumen', `${formatoNumero(m.volumenMm3 / 1000, 1)} cm³`]);
  if (!p) return filas;
  const nombre = <T extends { id: string; nombre: string }>(lista: T[], id: unknown) => lista.find((x) => x.id === id)?.nombre ?? String(id ?? '—');
  filas.push(['Material', nombre(config.materiales, p.materialId)]);
  if (Array.isArray(p.colores)) filas.push(['Color', p.colores.map((c) => nombre(config.colores, c)).join(', ')]);
  filas.push(['Calidad', nombre(config.calidades, p.calidadId)]);
  if (typeof p.relleno === 'number') filas.push(['Relleno', `${Math.round(p.relleno * 100)} %`]);
  if (p.cantidad) filas.push(['Cantidad', String(p.cantidad)]);
  filas.push(['Posprocesado', nombre(config.posprocesados, p.posprocesadoId)]);
  filas.push(['Urgencia', nombre(config.urgencias, p.urgenciaId)]);
  return filas;
}
