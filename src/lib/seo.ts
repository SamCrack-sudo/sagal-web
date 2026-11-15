/**
 * Datos estructurados (schema.org) para SEO local.
 * Solo se publican datos reales de src/config/marca.ts; los marcadores pendientes
 * (teléfono, dirección…) se omiten en vez de publicar datos falsos.
 */
import { marca, esMarcador } from '@/config/marca';

type JsonLd = Record<string, unknown>;

export function urlAbsoluta(ruta: string, sitio: URL | string | undefined): string {
  const base = sitio ? new URL(sitio.toString()) : new URL('https://sagal-robotics.example');
  return new URL(ruta, base).toString();
}

export function negocioLocal(sitio: URL | string | undefined): JsonLd {
  const telefono = marca.contacto.whatsapp.replace(/\D/g, '');
  const sameAs: string[] = [];
  if (!esMarcador(marca.contacto.instagram)) sameAs.push(`https://www.instagram.com/${marca.contacto.instagram}/`);
  if (!esMarcador(marca.contacto.mercadoLibre)) sameAs.push(marca.contacto.mercadoLibre);

  const direccion: JsonLd = {
    '@type': 'PostalAddress',
    addressLocality: marca.ubicacion.ciudad,
    addressRegion: marca.ubicacion.region,
    addressCountry: marca.ubicacion.codigoPais,
  };
  if (!esMarcador(marca.ubicacion.direccion)) direccion.streetAddress = marca.ubicacion.direccion;

  const datos: JsonLd = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': urlAbsoluta('/#negocio', sitio),
    name: marca.nombre,
    description: marca.descripcion,
    url: urlAbsoluta('/', sitio),
    email: marca.contacto.correo,
    image: urlAbsoluta(marca.seo.imagenOg, sitio),
    logo: urlAbsoluta('/favicon.svg', sitio),
    address: direccion,
    geo: { '@type': 'GeoCoordinates', latitude: marca.ubicacion.geo.lat, longitude: marca.ubicacion.geo.lng },
    areaServed: marca.ubicacion.areaServicio.map((c) => ({ '@type': 'City', name: c })),
    knowsAbout: ['Impresión 3D', 'Diseño CAD', 'Ingeniería inversa', 'Robótica', 'Electrónica', 'Prototipado'],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios',
      itemListElement: [
        servicioOferta('Impresión 3D bajo pedido', '/servicios/impresion-3d', sitio),
        servicioOferta('Diseño CAD', '/servicios/diseno-cad', sitio),
        servicioOferta('Robótica y electrónica', '/servicios/robotica-y-electronica', sitio),
        servicioOferta('Repuestos y piezas para empresas', '/empresas', sitio),
      ],
    },
  };
  if (telefono.length >= 10 && !esMarcador(marca.contacto.whatsapp)) datos.telephone = `+${telefono}`;
  if (sameAs.length) datos.sameAs = sameAs;
  return datos;
}

function servicioOferta(nombre: string, ruta: string, sitio: URL | string | undefined): JsonLd {
  return {
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: nombre, url: urlAbsoluta(ruta, sitio) },
  };
}

export function servicio(
  { nombre, descripcion, ruta, tipo }: { nombre: string; descripcion: string; ruta: string; tipo: string },
  sitio: URL | string | undefined,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: nombre,
    serviceType: tipo,
    description: descripcion,
    url: urlAbsoluta(ruta, sitio),
    provider: { '@id': urlAbsoluta('/#negocio', sitio) },
    areaServed: marca.ubicacion.areaServicio.map((c) => ({ '@type': 'City', name: c })),
  };
}

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export function paginaFaq(preguntas: PreguntaFrecuente[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map((p) => ({
      '@type': 'Question',
      name: p.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
    })),
  };
}

export function migas(items: { nombre: string; ruta: string }[], sitio: URL | string | undefined): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nombre,
      item: urlAbsoluta(it.ruta, sitio),
    })),
  };
}
