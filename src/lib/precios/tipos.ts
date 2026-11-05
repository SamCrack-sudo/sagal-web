/**
 * Tipos de la configuración de precios. En la fase 1 la configuración vive en
 * src/config/precios.ts; en la fase 2 se edita desde el panel (/admin) y se
 * guarda en Supabase con esta misma forma.
 */

export interface Material {
  id: string;
  nombre: string;
  descripcion: string;
  /** Usos recomendados, para ayudar al cliente a elegir. */
  usos: string;
  /** Densidad en g/cm³. */
  densidad: number;
  /** Precio del filamento por kilogramo (COP). */
  precioKg: number;
  /** Multiplicador de velocidad respecto al PLA (TPU es más lento: < 1). */
  factorVelocidad: number;
  /** Si el material admite varios colores con el AMS. */
  permiteMulticolor: boolean;
  /** Ids de los colores disponibles en este material. */
  colores: string[];
  activo: boolean;
}

export interface Color {
  id: string;
  nombre: string;
  /** Color aproximado para la muestra visual. */
  hex: string;
  activo: boolean;
}

export interface Calidad {
  id: string;
  nombre: string;
  alturaCapaMm: number;
  /** Multiplicador de velocidad respecto a la calidad de referencia (1 = referencia). */
  factorVelocidad: number;
  descripcion: string;
  activo: boolean;
}

export interface Posprocesado {
  id: string;
  nombre: string;
  descripcion: string;
  /** Costo por pieza (COP). */
  costoPorPieza: number;
  /** Días hábiles adicionales. */
  diasExtra: number;
  activo: boolean;
}

export interface Urgencia {
  id: string;
  nombre: string;
  descripcion: string;
  /** Recargo como fracción (0.25 = +25 %). */
  recargo: number;
  /** Multiplicador del plazo de entrega (0.5 = la mitad del tiempo). */
  factorPlazo: number;
  activo: boolean;
}

export interface DescuentoCantidad {
  /** Cantidad mínima de piezas para aplicar el descuento. */
  desde: number;
  /** Descuento como fracción (0.1 = 10 %). */
  descuento: number;
}

export interface ConfigPrecios {
  moneda: 'COP';
  /** true mientras los valores sean de demostración y no precios reales. */
  esDemo: boolean;

  /** Desperdicio de material (purgas, soportes, fallas) como fracción. */
  desperdicio: number;
  /** Paredes: número de perímetros y ancho de línea, para el volumen efectivo. */
  paredes: { lineas: number; anchoLineaMm: number };
  /** Opciones de relleno ofrecidas (fracciones). */
  rellenos: number[];
  rellenoPorDefecto: number;

  /** Caudal de referencia de la impresora en cm³/h con la calidad de factor 1. */
  caudalCm3PorHora: number;
  /** Factor de calibración del tiempo (ajústalo comparando con el laminador). */
  factorCalibracion: number;
  /** Tiempo mínimo de máquina por pieza (h). */
  horasMinimasPorPieza: number;

  /** Tarifa de máquina por hora (COP). */
  tarifaMaquinaHora: number;
  /** Costo de preparación por pedido: revisión de archivo, laminado, montaje (COP). */
  preparacionPorPedido: number;
  /** Recargo por cada cambio de color con el AMS, por pieza (COP). */
  recargoCambioColor: number;
  /** Máximo de colores por pieza. */
  maxColores: number;

  /** Margen sobre el costo como fracción (0.4 = 40 %). */
  margen: number;
  /** Valor mínimo de un pedido (COP, antes de IVA). */
  pedidoMinimo: number;
  descuentosCantidad: DescuentoCantidad[];
  /** IVA: si se cobra y su tasa. */
  iva: { cobrar: boolean; tasa: number };
  /** Redondeo de los valores finales (COP). */
  redondeo: number;

  entrega: {
    /** Horas de máquina disponibles por día hábil. */
    horasMaquinaPorDia: number;
    /** Días hábiles de preparación antes de imprimir. */
    diasPreparacion: number;
  };

  materiales: Material[];
  colores: Color[];
  calidades: Calidad[];
  posprocesados: Posprocesado[];
  urgencias: Urgencia[];
}
