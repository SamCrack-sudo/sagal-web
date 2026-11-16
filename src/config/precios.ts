/**
 * CONFIGURACIÓN INICIAL DE PRECIOS
 * ────────────────────────────────
 * Valores aprobados como punto de partida (noviembre de 2026). Los precios
 * reales se ajustan desde /admin → Precios (se guardan en Supabase); este
 * archivo es el valor inicial y el respaldo si la base de datos no responde.
 * Tras cambiarlo, regenera la semilla con `npm run semilla`.
 *
 * [REVISAR] Los precios por kg de LW-PLA, PLA-CF y ABS son estimaciones:
 * ajústalos con lo que te cuesta cada rollo. Las densidades son valores
 * típicos de cada familia: confírmalas con la ficha técnica del proveedor.
 * [CONFIGURAR] Los colores disponibles por material aún no están definidos.
 */
import type { ConfigPrecios } from '@/lib/precios/tipos';

const coloresBasicos = ['negro', 'blanco', 'gris', 'azul', 'rojo', 'naranja', 'verde', 'amarillo'];

export const configPreciosInicial: ConfigPrecios = {
  moneda: 'COP',
  esDemo: false, // Valores aprobados; vuelve a true para mostrar el aviso de demostración

  desperdicio: 0.08, // [CONFIGURAR] 8 %
  paredes: { lineas: 2, anchoLineaMm: 0.42 }, // [CONFIGURAR] perfil del laminador
  rellenos: [0.1, 0.15, 0.25, 0.4, 0.6, 1],
  rellenoPorDefecto: 0.15,

  caudalCm3PorHora: 15, // [CONFIGURAR] calibrar con tiempos reales de la P2S
  factorCalibracion: 1, // [CONFIGURAR]
  horasMinimasPorPieza: 0.25, // [CONFIGURAR]

  tarifaMaquinaHora: 5000,
  preparacionPorPedido: 5000,
  recargoCambioColor: 1500,
  maxColores: 4, // Confirmado: AMS 2 Pro

  margen: 0.4,
  pedidoMinimo: 20000,
  descuentosCantidad: [
   
    { desde: 5, descuento: 0.05 },
    { desde: 10, descuento: 0.1 },
    { desde: 25, descuento: 0.15 },
  ],
  iva: { cobrar: false, tasa: 0.19 }, // [CONFIGURAR] ¿eres responsable de IVA?
  redondeo: 100,

  entrega: {
    horasMaquinaPorDia: 16, // [CONFIGURAR]
    diasPreparacion: 1, // [CONFIGURAR]
  },

  // Materiales disponibles en el taller. [CONFIGURAR] colores de cada uno.
  materiales: [
    {
      id: 'pla',
      nombre: 'PLA',
      descripcion: 'Rígido, preciso y con buen acabado. El más versátil.',
      usos: 'Prototipos, maquetas, carcasas, soportes y piezas de uso interior.',
      densidad: 1.24,
      precioKg: 100000,
      factorVelocidad: 1,
      permiteMulticolor: true,
      colores: coloresBasicos,
      activo: true,
    },
    {
      id: 'lw-pla',
      nombre: 'LW-PLA (ligero)',
      descripcion: 'PLA espumado: hasta la mitad del peso de una pieza normal, con acabado mate.',
      usos: 'Aeromodelismo, drones, cosplay y piezas grandes donde importa el peso.',
      densidad: 0.8, // densidad efectiva espumado: depende de la temperatura de impresión
      precioKg: 180000, // [REVISAR] estimado
      factorVelocidad: 0.7,
      permiteMulticolor: false,
      colores: ['blanco', 'negro'],
      activo: true,
    },
    {
      id: 'pla-cf',
      nombre: 'PLA-CF (fibra de carbono)',
      descripcion: 'PLA reforzado con fibra de carbono: más rígido, liviano y con acabado mate técnico.',
      usos: 'Soportes rígidos, piezas estructurales, accesorios para drones y herramentales.',
      densidad: 1.3,
      precioKg: 160000, // [REVISAR] estimado
      factorVelocidad: 0.9,
      permiteMulticolor: true,
      colores: ['negro'],
      activo: true,
    },
    {
      id: 'petg',
      nombre: 'PETG',
      descripcion: 'Más tenaz que el PLA y resiste mejor la temperatura y la humedad.',
      usos: 'Piezas funcionales, soportes mecánicos, guardas y piezas con algo de calor o agua.',
      densidad: 1.27,
      precioKg: 110000,
      factorVelocidad: 0.9,
      permiteMulticolor: true,
      colores: ['negro', 'blanco', 'gris', 'azul', 'transparente'],
      activo: true,
    },
    {
      id: 'abs',
      nombre: 'ABS',
      descripcion: 'Resistente al impacto y a temperaturas más altas que el PLA y el PETG.',
      usos: 'Carcasas, piezas para vehículos (interior), repuestos industriales y piezas cerca de motores.',
      densidad: 1.04,
      precioKg: 105000, // [REVISAR] estimado
      factorVelocidad: 0.85,
      permiteMulticolor: true,
      colores: ['negro', 'blanco', 'gris', 'rojo', 'azul'],
      activo: true,
    },
    {
      id: 'tpu',
      nombre: 'TPU (flexible)',
      descripcion: 'Flexible y resistente al desgaste, similar al caucho.',
      usos: 'Empaques, amortiguadores, protectores, agarres y correas.',
      densidad: 1.21,
      precioKg: 150000,
      factorVelocidad: 0.45,
      permiteMulticolor: false,
      colores: ['negro', 'blanco'],
      activo: true,
    },
  ],

  colores: [
    { id: 'negro', nombre: 'Negro', hex: '#1b1d21', activo: true },
    { id: 'blanco', nombre: 'Blanco', hex: '#f4f4f2', activo: true },
    { id: 'gris', nombre: 'Gris', hex: '#8a9099', activo: true },
    { id: 'azul', nombre: 'Azul', hex: '#1f4fa3', activo: true },
    { id: 'rojo', nombre: 'Rojo', hex: '#c62828', activo: true },
    { id: 'naranja', nombre: 'Naranja', hex: '#ff6a13', activo: true },
    { id: 'verde', nombre: 'Verde', hex: '#2e7d32', activo: true },
    { id: 'amarillo', nombre: 'Amarillo', hex: '#f2c230', activo: true },
    { id: 'transparente', nombre: 'Transparente', hex: '#dfe8ee', activo: true },
  ],

  // Factores de velocidad relativos a 0,20 mm (ajústalos al calibrar)
  calidades: [
    {
      id: 'fina',
      nombre: 'Fina',
      alturaCapaMm: 0.12,
      factorVelocidad: 0.6,
      descripcion: 'Detalle alto y capas casi invisibles. Más lenta.',
      activo: true,
    },
    {
      id: 'estandar',
      nombre: 'Estándar',
      alturaCapaMm: 0.2,
      factorVelocidad: 1,
      descripcion: 'Equilibrio entre detalle y tiempo. Recomendada.',
      activo: true,
    },
    {
      id: 'rapida',
      nombre: 'Rápida',
      alturaCapaMm: 0.28,
      factorVelocidad: 1.3,
      descripcion: 'Para piezas funcionales donde el acabado importa menos.',
      activo: true,
    },
  ],

  posprocesados: [
    { id: 'ninguno', nombre: 'Sin posprocesado', descripcion: 'La pieza como sale de la impresora, sin soportes.', costoPorPieza: 0, diasExtra: 0, activo: true },
    { id: 'lijado', nombre: 'Lijado', descripcion: 'Superficies visibles lijadas para un acabado más uniforme.', costoPorPieza: 15000, diasExtra: 1, activo: true },
    { id: 'insertos', nombre: 'Insertos roscados', descripcion: 'Instalación de insertos metálicos para tornillos.', costoPorPieza: 8000, diasExtra: 1, activo: true },
    { id: 'pintura', nombre: 'Imprimación y pintura', descripcion: 'Acabado pintado en el color que elijas.', costoPorPieza: 40000, diasExtra: 3, activo: true },
  ],

  urgencias: [
    { id: 'normal', nombre: 'Normal', descripcion: 'Plazo estándar.', recargo: 0, factorPlazo: 1, activo: true },
    { id: 'prioritaria', nombre: 'Prioritaria', descripcion: 'Pasa adelante en la cola de producción.', recargo: 0.25, factorPlazo: 0.6, activo: true },
    { id: 'urgente', nombre: 'Urgente', descripcion: 'Lo más pronto posible, según disponibilidad.', recargo: 0.6, factorPlazo: 0.35, activo: true },
  ],
};
