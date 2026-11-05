/**
 * MOTOR DE PRECIOS DEL COTIZADOR — módulo puro (sin DOM ni red).
 * Se usa igual en el navegador (precio en vivo) y en el servidor (recalcula el
 * precio a partir del archivo para que el cliente no pueda manipularlo).
 *
 * Fórmula (sección 6 del documento de requisitos):
 *   volumen efectivo = paredes + relleno × interior
 *   gramos  = volumen efectivo × densidad × (1 + desperdicio)
 *   horas   = volumen efectivo / (caudal × f. calidad × f. material) × calibración
 *   costo   = gramos × precio/g + horas × tarifa/h + preparación + posprocesado
 *             + recargo por cambios de color (AMS)
 *   precio  = máx(pedido mínimo, costo × (1 + margen)) × (1 − descuento por cantidad)
 *             × (1 + recargo por urgencia)       [+ IVA si se cobra]
 *
 * Decisiones (documentadas en el README):
 * - El costo se calcula por pieza y se multiplica por la cantidad; la preparación
 *   se cobra una vez por pedido. El pedido mínimo aplica al pedido completo.
 * - El volumen de paredes se aproxima como área × perímetros × ancho de línea
 *   (sin capas superiores/inferiores ni soportes; el desperdicio los cubre).
 * - Cambios de color por pieza = colores − 1.
 */
import type { ConfigPrecios, DescuentoCantidad } from './tipos';

export interface EntradaCotizacion {
  volumenMm3: number;
  areaMm2: number;
  materialId: string;
  colores: string[];
  calidadId: string;
  /** Relleno como fracción 0–1. */
  relleno: number;
  cantidad: number;
  posprocesadoId: string;
  urgenciaId: string;
}

export interface DesglosePieza {
  volumenEfectivoCm3: number;
  gramos: number;
  horas: number;
  costoMaterial: number;
  costoMaquina: number;
  costoPosprocesado: number;
  costoColor: number;
  /** Suma de los costos de la pieza (sin preparación ni margen). */
  costo: number;
}

export interface ResultadoCotizacion {
  pieza: DesglosePieza;
  pedido: {
    cantidad: number;
    gramos: number;
    horas: number;
    costoMaterial: number;
    costoMaquina: number;
    costoPreparacion: number;
    costoPosprocesado: number;
    costoColor: number;
    /** Costo total de producción del pedido. */
    costo: number;
    /** Costo × (1 + margen). */
    conMargen: number;
    aplicaMinimo: boolean;
    /** máx(pedido mínimo, costo con margen). */
    base: number;
    descuento: number;
    montoDescuento: number;
    recargoUrgencia: number;
    montoUrgencia: number;
    /** Precio antes de IVA (redondeado). */
    subtotal: number;
    iva: number;
    /** Lo que paga el cliente. */
    total: number;
  };
  precioUnitario: number;
  entrega: { diasHabiles: number; horasMaquina: number };
  advertencias: string[];
}

export class ErrorCotizacion extends Error {
  constructor(
    message: string,
    public readonly campo: keyof EntradaCotizacion,
  ) {
    super(message);
    this.name = 'ErrorCotizacion';
  }
}

export function redondear(valor: number, paso: number): number {
  if (paso <= 0) return Math.round(valor);
  return Math.round(valor / paso) * paso;
}

export function descuentoPorCantidad(cantidad: number, tabla: DescuentoCantidad[]): number {
  let d = 0;
  for (const t of [...tabla].sort((a, b) => a.desde - b.desde)) if (cantidad >= t.desde) d = t.descuento;
  return d;
}

/** Volumen efectivo impreso (mm³): paredes macizas + interior según el relleno. */
export function volumenEfectivo(
  volumenMm3: number,
  areaMm2: number,
  relleno: number,
  paredes: ConfigPrecios['paredes'],
): number {
  const paredesMm3 = Math.min(volumenMm3, areaMm2 * paredes.lineas * paredes.anchoLineaMm);
  const interior = Math.max(0, volumenMm3 - paredesMm3);
  return paredesMm3 + interior * relleno;
}

export function validarEntrada(e: EntradaCotizacion, c: ConfigPrecios) {
  if (!(e.volumenMm3 > 0) || !Number.isFinite(e.volumenMm3)) throw new ErrorCotizacion('La pieza no tiene volumen.', 'volumenMm3');
  if (!(e.areaMm2 >= 0) || !Number.isFinite(e.areaMm2)) throw new ErrorCotizacion('Área inválida.', 'areaMm2');
  const material = c.materiales.find((m) => m.id === e.materialId && m.activo);
  if (!material) throw new ErrorCotizacion('Material no disponible.', 'materialId');
  if (!c.calidades.some((q) => q.id === e.calidadId && q.activo)) throw new ErrorCotizacion('Calidad no disponible.', 'calidadId');
  if (!c.posprocesados.some((p) => p.id === e.posprocesadoId && p.activo)) throw new ErrorCotizacion('Posprocesado no disponible.', 'posprocesadoId');
  if (!c.urgencias.some((u) => u.id === e.urgenciaId && u.activo)) throw new ErrorCotizacion('Urgencia no disponible.', 'urgenciaId');
  if (!(e.relleno > 0 && e.relleno <= 1)) throw new ErrorCotizacion('El relleno debe estar entre 1 % y 100 %.', 'relleno');
  if (!Number.isInteger(e.cantidad) || e.cantidad < 1 || e.cantidad > 10000) {
    throw new ErrorCotizacion('La cantidad debe ser un número entero entre 1 y 10 000.', 'cantidad');
  }
  const unicos = new Set(e.colores);
  if (e.colores.length < 1 || unicos.size !== e.colores.length) throw new ErrorCotizacion('Elige al menos un color, sin repetir.', 'colores');
  const maxColores = material.permiteMulticolor ? c.maxColores : 1;
  if (e.colores.length > maxColores) {
    throw new ErrorCotizacion(`Este material admite máximo ${maxColores} color${maxColores > 1 ? 'es' : ''}.`, 'colores');
  }
  for (const id of e.colores) {
    if (!material.colores.includes(id) || !c.colores.some((col) => col.id === id && col.activo)) {
      throw new ErrorCotizacion('Color no disponible para este material.', 'colores');
    }
  }
}

export function cotizar(e: EntradaCotizacion, c: ConfigPrecios): ResultadoCotizacion {
  validarEntrada(e, c);
  const material = c.materiales.find((m) => m.id === e.materialId)!;
  const calidad = c.calidades.find((q) => q.id === e.calidadId)!;
  const post = c.posprocesados.find((p) => p.id === e.posprocesadoId)!;
  const urgencia = c.urgencias.find((u) => u.id === e.urgenciaId)!;
  const advertencias: string[] = [];

  // ── Por pieza ──
  const volEfMm3 = volumenEfectivo(e.volumenMm3, e.areaMm2, e.relleno, c.paredes);
  const volEfCm3 = volEfMm3 / 1000;
  const gramos = volEfCm3 * material.densidad * (1 + c.desperdicio);
  const caudal = c.caudalCm3PorHora * calidad.factorVelocidad * material.factorVelocidad;
  const horas = Math.max(c.horasMinimasPorPieza, (volEfCm3 / caudal) * c.factorCalibracion);
  const cambiosColor = Math.max(0, e.colores.length - 1);

  const costoMaterial = gramos * (material.precioKg / 1000);
  const costoMaquina = horas * c.tarifaMaquinaHora;
  const costoPosprocesado = post.costoPorPieza;
  const costoColor = cambiosColor * c.recargoCambioColor;
  const costoPieza = costoMaterial + costoMaquina + costoPosprocesado + costoColor;

  // ── Pedido ──
  const n = e.cantidad;
  const costoPedido = costoPieza * n + c.preparacionPorPedido;
  const conMargen = costoPedido * (1 + c.margen);
  const aplicaMinimo = conMargen < c.pedidoMinimo;
  const base = Math.max(c.pedidoMinimo, conMargen);
  const descuento = descuentoPorCantidad(n, c.descuentosCantidad);
  const montoDescuento = base * descuento;
  const trasDescuento = base - montoDescuento;
  const montoUrgencia = trasDescuento * urgencia.recargo;
  const subtotal = redondear(trasDescuento + montoUrgencia, c.redondeo);
  const iva = c.iva.cobrar ? redondear(subtotal * c.iva.tasa, c.redondeo) : 0;
  const total = subtotal + iva;

  if (aplicaMinimo) advertencias.push('Se aplicó el valor de pedido mínimo.');

  // ── Entrega (días hábiles) ──
  const horasMaquina = horas * n;
  const diasProduccion = Math.ceil(horasMaquina / c.entrega.horasMaquinaPorDia);
  const diasHabiles = Math.max(
    1,
    Math.ceil((c.entrega.diasPreparacion + diasProduccion + post.diasExtra) * urgencia.factorPlazo),
  );

  return {
    pieza: {
      volumenEfectivoCm3: volEfCm3,
      gramos,
      horas,
      costoMaterial,
      costoMaquina,
      costoPosprocesado,
      costoColor,
      costo: costoPieza,
    },
    pedido: {
      cantidad: n,
      gramos: gramos * n,
      horas: horasMaquina,
      costoMaterial: costoMaterial * n,
      costoMaquina: costoMaquina * n,
      costoPreparacion: c.preparacionPorPedido,
      costoPosprocesado: costoPosprocesado * n,
      costoColor: costoColor * n,
      costo: costoPedido,
      conMargen,
      aplicaMinimo,
      base,
      descuento,
      montoDescuento,
      recargoUrgencia: urgencia.recargo,
      montoUrgencia,
      subtotal,
      iva,
      total,
    },
    precioUnitario: total / n,
    entrega: { diasHabiles, horasMaquina },
    advertencias,
  };
}

/** Formato de moneda colombiana: $ 12.300 */
export function formatoCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

export function formatoNumero(valor: number, decimales = 0): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimales, minimumFractionDigits: decimales }).format(valor);
}
