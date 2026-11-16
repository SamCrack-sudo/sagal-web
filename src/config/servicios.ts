/**
 * Paquetes de diseño CAD.
 * [REVISAR] Precios y plazos son una estimación inicial (noviembre de 2026),
 * pensada para un taller que compite por calidad. Ajústalos con la experiencia.
 * El cliente es dueño del diseño: siempre recibe el archivo editable (STEP).
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
    incluye: ['Modelo 3D listo para imprimir', 'Archivos STL/3MF y STEP editable'],
    revisiones: '1 revisión',
    plazo: '1 a 2 días hábiles',
    precio: 'Desde $ 50.000',
  },
  {
    id: 'medio',
    nombre: 'Medio',
    para: 'Piezas con varios elementos, encajes o tolerancias entre partes.',
    ejemplos: ['Carcasas con tapa', 'Piezas que encajan con otras', 'Repuestos con medidas críticas'],
    incluye: ['Modelo 3D paramétrico', 'Archivos STL/3MF y STEP editable', 'Verificación de ajustes'],
    revisiones: '2 revisiones',
    plazo: '3 a 5 días hábiles',
    precio: 'Desde $ 120.000',
  },
  {
    id: 'complejo',
    nombre: 'Complejo',
    para: 'Ensambles, mecanismos o ingeniería inversa de piezas difíciles.',
    ejemplos: ['Ensambles de varias piezas', 'Mecanismos con movimiento', 'Superficies complejas'],
    incluye: ['Modelo y ensamble 3D', 'Archivos STL/3MF y STEP editable', 'Planos con medidas principales'],
    revisiones: '3 revisiones',
    plazo: '5 a 10 días hábiles',
    precio: 'Desde $ 250.000, según alcance',
  },
];

/** Porcentaje del valor del diseño que se descuenta si la pieza se fabrica con nosotros. */
export const porcentajeAbonoDiseno = 0.4;

export const abonoDiseno = `Si fabricas la pieza con nosotros, el ${porcentajeAbonoDiseno * 100} % del valor del diseño se descuenta del pedido de fabricación.`;
