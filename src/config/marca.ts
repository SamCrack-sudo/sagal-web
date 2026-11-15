/**
 * ARCHIVO ÚNICO DE MARCA
 * ──────────────────────
 * El nombre "SAGAL Robotics" es PROVISIONAL. Para cambiar la marca basta con
 * editar este archivo (y, si cambia el símbolo, `src/components/Logo.astro`).
 * Nombre, textos legales, contacto y metadatos se leen desde aquí.
 *
 * Todo valor entre corchetes [ASÍ] es un MARCADOR pendiente: el sitio lo muestra
 * tal cual para que sea fácil detectarlo. La lista completa está en el README.
 */

/** Devuelve true si el texto todavía es un marcador del tipo "[...]". */
export const esMarcador = (valor: string | null | undefined): boolean =>
  !valor || /^\[.*\]$/.test(valor.trim());

export const marca = {
  /** Nombre completo de la marca. */
  nombre: 'SAGAL Robotics',
  /** Parte destacada del nombre (en negrita en el logotipo). */
  nombreFuerte: 'SAGAL',
  /** Parte ligera del nombre en el logotipo. */
  nombreSuave: 'Robotics',
  /** Código corto que aparece en planos, números de cotización, etc. */
  prefijo: 'SR',

  eslogan: ['Diseñamos la pieza.', 'La imprimimos.', 'La hacemos funcionar.'],
  descripcionCorta:
    'Taller de ingeniería en Cajicá: diseño CAD, impresión 3D, robótica y electrónica a la medida.',
  descripcion:
    'Taller de ingeniería en Cajicá, Cundinamarca. Hacemos diseño CAD, impresión 3D multicolor y multimaterial, robótica y electrónica a la medida, con criterio de ingeniería mecatrónica.',

  contacto: {
    correo: 'sagalrobotics@gmail.com',
    /** Número de WhatsApp en formato internacional, solo dígitos (ej. 573001234567). */
    whatsapp: '[MI NÚMERO CON +57]',
    /** Usuario de Instagram sin la arroba. */
    instagram: '[MI_USUARIO]',
    /** Enlace a la tienda en MercadoLibre (fase 3). */
    mercadoLibre: '[ENLACE MERCADOLIBRE]',
  },

  ubicacion: {
    ciudad: 'Cajicá',
    region: 'Cundinamarca',
    pais: 'Colombia',
    codigoPais: 'CO',
    zona: 'Sabana Centro',
    /** Dirección física. Déjala como marcador si no quieres publicarla. */
    direccion: '[DIRECCIÓN DEL TALLER]',
    /** Coordenadas aproximadas del centro de Cajicá (dato público). */
    geo: { lat: 4.9186, lng: -74.0255 },
    /** Zonas que se atienden, para SEO local. */
    areaServicio: ['Cajicá', 'Chía', 'Zipaquirá', 'Tabio', 'Tenjo', 'Sopó', 'Cota', 'Bogotá'],
    horario: '[HORARIO DE ATENCIÓN]',
  },

  legal: {
    /** Razón social o nombre de la persona natural responsable. */
    responsable: '[NOMBRE O RAZÓN SOCIAL DEL RESPONSABLE]',
    /** NIT o cédula del responsable del tratamiento de datos. */
    identificacion: '[NIT O CÉDULA]',
    /** Correo para ejercer derechos de habeas data. */
    correoDatos: 'sagalrobotics@gmail.com',
    /** Fecha de la última actualización de los documentos legales. */
    fechaActualizacion: '[FECHA DE PUBLICACIÓN]',
  },

  equipos: {
    impresora: 'Bambu Lab P2S',
    sistemaColor: 'AMS 2 Pro',
    /** Volumen de impresión útil en mm. [CONFIRMAR: 256 × 256 × 256 mm] */
    volumenImpresion: { x: 256, y: 256, z: 256 },
  },

  /** Metadatos por defecto para SEO y redes. */
  seo: {
    tituloPorDefecto: 'Impresión 3D, diseño CAD y robótica en Cajicá',
    imagenOg: '/og/sagal-og.png',
    colorTema: '#16325C',
    locale: 'es_CO',
  },

  fundacion: '[AÑO DE FUNDACIÓN]',
} as const;

export type Marca = typeof marca;

/** Enlace de WhatsApp con mensaje prellenado; null si el número aún es un marcador. */
export function enlaceWhatsApp(mensaje: string, numero: string = marca.contacto.whatsapp): string | null {
  const digitos = numero.replace(/\D/g, '');
  if (esMarcador(numero) || digitos.length < 10) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}

export function enlaceInstagram(): string | null {
  if (esMarcador(marca.contacto.instagram)) return null;
  return `https://www.instagram.com/${marca.contacto.instagram.replace(/^@/, '')}/`;
}

export function enlaceCorreo(asunto?: string, cuerpo?: string): string {
  const params = new URLSearchParams();
  if (asunto) params.set('subject', asunto);
  if (cuerpo) params.set('body', cuerpo);
  const query = params.toString().replace(/\+/g, '%20');
  return `mailto:${marca.contacto.correo}${query ? `?${query}` : ''}`;
}
