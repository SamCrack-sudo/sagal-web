/**
 * Valida una configuración de precios antes de guardarla desde el panel, para
 * que un error de tipeo no deje el cotizador fuera de servicio.
 */
import type { ConfigPrecios } from './tipos';

export interface ResultadoValidacion {
  ok: boolean;
  errores: string[];
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function validarConfigPrecios(c: unknown): ResultadoValidacion {
  const errores: string[] = [];
  const e = (msg: string) => errores.push(msg);
  if (!c || typeof c !== 'object') return { ok: false, errores: ['La configuración está vacía o dañada.'] };
  const cfg = c as Partial<ConfigPrecios>;

  const rango = (nombre: string, v: unknown, min: number, max: number) => {
    if (!num(v) || v < min || v > max) e(`${nombre} debe ser un número entre ${min} y ${max}.`);
  };

  rango('El desperdicio', cfg.desperdicio, 0, 2);
  rango('El margen', cfg.margen, 0, 10);
  rango('El pedido mínimo', cfg.pedidoMinimo, 0, 1e9);
  rango('La tarifa de máquina por hora', cfg.tarifaMaquinaHora, 0, 1e7);
  rango('La preparación por pedido', cfg.preparacionPorPedido, 0, 1e8);
  rango('El recargo por cambio de color', cfg.recargoCambioColor, 0, 1e7);
  rango('El caudal de la impresora', cfg.caudalCm3PorHora, 0.1, 1000);
  rango('El factor de calibración', cfg.factorCalibracion, 0.05, 20);
  rango('Las horas mínimas por pieza', cfg.horasMinimasPorPieza, 0, 100);
  rango('El máximo de colores', cfg.maxColores, 1, 16);
  rango('El redondeo', cfg.redondeo, 0, 100000);
  rango('Las líneas de pared', cfg.paredes?.lineas, 1, 20);
  rango('El ancho de línea', cfg.paredes?.anchoLineaMm, 0.1, 2);
  rango('La tasa de IVA', cfg.iva?.tasa, 0, 1);
  rango('Las horas de máquina por día', cfg.entrega?.horasMaquinaPorDia, 1, 24);
  rango('Los días de preparación', cfg.entrega?.diasPreparacion, 0, 60);
  if (typeof cfg.iva?.cobrar !== 'boolean') e('Indica si se cobra IVA.');
  if (typeof cfg.esDemo !== 'boolean') e('Falta indicar si los precios son de demostración.');

  if (!Array.isArray(cfg.rellenos) || cfg.rellenos.length === 0 || cfg.rellenos.some((r) => !num(r) || r <= 0 || r > 1)) {
    e('Los rellenos deben ser porcentajes entre 1 % y 100 %.');
  } else if (!cfg.rellenos.includes(cfg.rellenoPorDefecto as number)) {
    e('El relleno por defecto debe estar entre las opciones de relleno.');
  }

  if (!Array.isArray(cfg.descuentosCantidad)) e('Los descuentos por cantidad están dañados.');
  else
    cfg.descuentosCantidad.forEach((d, i) => {
      if (!num(d.desde) || d.desde < 2 || !Number.isInteger(d.desde)) e(`Descuento ${i + 1}: la cantidad mínima debe ser un entero de 2 o más.`);
      if (!num(d.descuento) || d.descuento <= 0 || d.descuento >= 1) e(`Descuento ${i + 1}: el porcentaje debe estar entre 1 % y 99 %.`);
    });

  const ids = (lista: { id: string }[] | undefined, nombre: string) => {
    if (!Array.isArray(lista) || lista.length === 0) {
      e(`Debe haber al menos un elemento en ${nombre}.`);
      return;
    }
    const vistos = new Set<string>();
    for (const x of lista) {
      if (!x.id || !/^[a-z0-9-]{1,40}$/.test(x.id)) e(`${nombre}: el identificador "${x.id}" no es válido (minúsculas, números y guiones).`);
      if (vistos.has(x.id)) e(`${nombre}: el identificador "${x.id}" está repetido.`);
      vistos.add(x.id);
    }
  };

  ids(cfg.colores, 'colores');
  ids(cfg.materiales, 'materiales');
  ids(cfg.calidades, 'calidades');
  ids(cfg.posprocesados, 'posprocesados');
  ids(cfg.urgencias, 'urgencias');

  const coloresActivos = new Set((cfg.colores ?? []).filter((x) => x.activo).map((x) => x.id));
  for (const col of cfg.colores ?? []) {
    if (!col.nombre?.trim()) e(`El color "${col.id}" no tiene nombre.`);
    if (!/^#[0-9a-fA-F]{6}$/.test(col.hex ?? '')) e(`El color "${col.nombre}" debe tener un código hexadecimal como #1A2B3C.`);
  }

  for (const m of cfg.materiales ?? []) {
    const n = m.nombre?.trim() || m.id;
    if (!m.nombre?.trim()) e(`El material "${m.id}" no tiene nombre.`);
    rango(`La densidad de ${n}`, m.densidad, 0.3, 5);
    rango(`El precio por kg de ${n}`, m.precioKg, 0, 1e8);
    rango(`El factor de velocidad de ${n}`, m.factorVelocidad, 0.05, 5);
    if (!Array.isArray(m.colores)) e(`Los colores de ${n} están dañados.`);
    else {
      for (const id of m.colores) if (!(cfg.colores ?? []).some((x) => x.id === id)) e(`${n} usa el color "${id}", que no existe.`);
      if (m.activo && !m.colores.some((id) => coloresActivos.has(id))) e(`${n} está activo pero no tiene ningún color activo.`);
    }
  }

  for (const q of cfg.calidades ?? []) {
    rango(`La altura de capa de ${q.nombre}`, q.alturaCapaMm, 0.04, 1);
    rango(`El factor de velocidad de ${q.nombre}`, q.factorVelocidad, 0.05, 5);
  }
  for (const p of cfg.posprocesados ?? []) {
    rango(`El costo de ${p.nombre}`, p.costoPorPieza, 0, 1e8);
    rango(`Los días extra de ${p.nombre}`, p.diasExtra, 0, 60);
  }
  for (const u of cfg.urgencias ?? []) {
    rango(`El recargo de ${u.nombre}`, u.recargo, 0, 10);
    rango(`El factor de plazo de ${u.nombre}`, u.factorPlazo, 0.05, 5);
  }

  const algunoActivo = (lista: { activo: boolean }[] | undefined, nombre: string) => {
    if (Array.isArray(lista) && !lista.some((x) => x.activo)) e(`Debe haber al menos un elemento activo en ${nombre}.`);
  };
  algunoActivo(cfg.materiales, 'materiales');
  algunoActivo(cfg.calidades, 'calidades');
  algunoActivo(cfg.posprocesados, 'posprocesados');
  algunoActivo(cfg.urgencias, 'urgencias');

  return { ok: errores.length === 0, errores };
}

/** Devuelve la configuración guardada si es válida; si no, la de respaldo. */
export function configValidaO(guardada: unknown, respaldo: ConfigPrecios): ConfigPrecios {
  return validarConfigPrecios(guardada).ok ? (guardada as ConfigPrecios) : respaldo;
}
