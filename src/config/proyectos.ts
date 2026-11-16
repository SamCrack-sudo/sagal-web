/**
 * Proyectos destacados de la portada. Mientras la lista esté vacía, la
 * sección "Trabajos recientes" no se muestra.
 * Para agregar uno, copia el ejemplo comentado y pon la foto en public/proyectos/.
 * (En la fase 3 los proyectos tendrán su propia página y se editarán desde el panel.)
 */
export interface ProyectoDestacado {
  nombre: string;
  /** Servicio y material, p. ej. "Diseño CAD + impresión en PETG". */
  detalle: string;
  /** Ruta de la foto dentro de public/, p. ej. "/proyectos/soporte-sensor.jpg". */
  foto: string;
  /** Texto alternativo de la foto (para lectores de pantalla). */
  alt: string;
}

export const proyectosDestacados: ProyectoDestacado[] = [
  // {
  //   nombre: 'Soporte para sensor de banda transportadora',
  //   detalle: 'Ingeniería inversa + impresión en PETG',
  //   foto: '/proyectos/soporte-sensor.jpg',
  //   alt: 'Soporte negro impreso en 3D montado sobre una banda transportadora',
  // },
];
