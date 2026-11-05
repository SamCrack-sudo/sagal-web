/** Estructura de navegación del sitio público. */
export interface Enlace {
  etiqueta: string;
  href: string;
  descripcion?: string;
}

export const servicios: Enlace[] = [
  {
    etiqueta: 'Impresión 3D',
    href: '/servicios/impresion-3d',
    descripcion: 'Piezas funcionales y prototipos, en uno o varios colores.',
  },
  {
    etiqueta: 'Diseño CAD',
    href: '/servicios/diseno-cad',
    descripcion: 'De una idea, un boceto o una pieza rota a un modelo listo para fabricar.',
  },
  {
    etiqueta: 'Robótica y electrónica',
    href: '/servicios/robotica-y-electronica',
    descripcion: 'Mecanismos, sensores, motores y control, probados antes de entregar.',
  },
];

export const navegacionPrincipal: Enlace[] = [
  { etiqueta: 'Empresas', href: '/empresas' },
  { etiqueta: 'Nosotros', href: '/nosotros' },
  { etiqueta: 'Contacto', href: '/contacto' },
];

export const enlacesLegales: Enlace[] = [
  { etiqueta: 'Política de tratamiento de datos', href: '/politica-de-datos' },
  { etiqueta: 'Términos y condiciones', href: '/terminos' },
];
