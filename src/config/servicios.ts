/**
 * Paquetes de diseño CAD. [CONFIGURAR] precios, plazos, revisiones y formatos.
 * En la fase 2 se podrán editar desde el panel.
 */
export interface PaqueteCad {
  id: 'simple' | 'medio' | 'complejo';
  nombre: string;
  para: string;
  ejemplos: string[];
  incluye: string[];
  revisiones: string;
  plazo: string;
  precio: string;
}

export const paquetesCad: PaqueteCad[] = [
  {
    id: 'simple',
    nombre: 'Simple',
    para: 'Piezas de geometría sencilla, con pocas medidas críticas.',
    ejemplos: ['Soportes y escuadras', 'Separadores y bujes', 'Tapas y placas'],
    incluye: ['Modelo 3D listo para imprimir', 'Archivo STL o 3MF'],
    revisiones: '[CONFIGURAR] revisión',
    plazo: '[CONFIGURAR] días hábiles',
    precio: '[CONFIGURAR PRECIO]',
  },
  {
    id: 'medio',
    nombre: 'Medio',
    para: 'Piezas con varios elementos, encajes o tolerancias entre partes.',
    ejemplos: ['Carcasas con tapa', 'Piezas que encajan con otras', 'Repuestos con medidas críticas'],
    incluye: ['Modelo 3D paramétrico', 'Archivos STL/3MF y STEP', 'Verificación de ajustes'],
    revisiones: '[CONFIGURAR] revisiones',
    plazo: '[CONFIGURAR] días hábiles',
    precio: '[CONFIGURAR PRECIO]',
  },
  {
    id: 'complejo',
    nombre: 'Complejo',
    para: 'Ensambles, mecanismos o ingeniería inversa de piezas difíciles.',
    ejemplos: ['Ensambles de varias piezas', 'Mecanismos con movimiento', 'Superficies complejas'],
    incluye: ['Modelo y ensamble 3D', 'Archivos STL/3MF y STEP', 'Planos con medidas principales'],
    revisiones: '[CONFIGURAR] revisiones',
    plazo: '[CONFIGURAR] días hábiles',
    precio: '[CONFIGURAR PRECIO]',
  },
];

/** Condición del abono del diseño al pedido de fabricación. */
export const abonoDiseno =
  'Si fabricas la pieza con nosotros, el valor del diseño se abona al pedido de fabricación. [CONFIGURAR: porcentaje y condiciones del abono]';
