/**
 * Estados del flujo comercial: nuevo → cotizado → aprobado → en producción
 * → listo → entregado → pagado (y cancelado, fuera del flujo).
 */
export const FLUJO = ['nuevo', 'cotizado', 'aprobado', 'en_produccion', 'listo', 'entregado', 'pagado'] as const;
export const ESTADOS = [...FLUJO, 'cancelado'] as const;
export type Estado = (typeof ESTADOS)[number];

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  nuevo: 'Nuevo',
  cotizado: 'Cotizado',
  aprobado: 'Aprobado',
  en_produccion: 'En producción',
  listo: 'Listo',
  entregado: 'Entregado',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
};

/** Cómo se le explica cada estado al cliente en /pedido/[codigo]. */
export const ESTADO_PARA_CLIENTE: Record<Estado, { titulo: string; texto: string }> = {
  nuevo: { titulo: 'Recibida', texto: 'Recibimos tu solicitud y la estamos revisando.' },
  cotizado: { titulo: 'Cotizada', texto: 'Tu cotización está lista. Revísala y apruébala para empezar.' },
  aprobado: { titulo: 'Aprobada', texto: 'Aprobaste la cotización. La programamos para producción.' },
  en_produccion: { titulo: 'En producción', texto: 'Estamos fabricando tu pedido.' },
  listo: { titulo: 'Lista', texto: 'Tu pedido está listo para entregar.' },
  entregado: { titulo: 'Entregada', texto: 'Entregamos tu pedido.' },
  pagado: { titulo: 'Pagada', texto: 'Pedido pagado y cerrado. ¡Gracias!' },
  cancelado: { titulo: 'Cancelada', texto: 'Esta solicitud fue cancelada.' },
};

export function esEstado(valor: unknown): valor is Estado {
  return typeof valor === 'string' && (ESTADOS as readonly string[]).includes(valor);
}

export function indiceFlujo(e: Estado): number {
  return (FLUJO as readonly string[]).indexOf(e);
}

export function siguienteEstado(e: Estado): Estado | null {
  const i = indiceFlujo(e);
  return i >= 0 && i < FLUJO.length - 1 ? FLUJO[i + 1]! : null;
}

/** ¿El pedido ya fue aprobado por el cliente (o va más adelante)? */
export function yaAprobado(e: Estado): boolean {
  return indiceFlujo(e) >= indiceFlujo('aprobado');
}

/** Estados en los que tiene sentido mostrar el enlace o los datos de pago. */
export function muestraPago(e: Estado): boolean {
  return ['cotizado', 'aprobado', 'en_produccion', 'listo', 'entregado'].includes(e);
}
