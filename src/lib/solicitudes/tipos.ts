/** Tipos compartidos entre formularios (cliente) y API (servidor). */

export interface OrigenVisita {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referente?: string;
  llegada?: string;
  fecha?: string;
}

export const TIPOS_CLIENTE = {
  persona: 'Persona',
  empresa: 'Empresa',
  colegio: 'Colegio o institución educativa',
} as const;
export type TipoCliente = keyof typeof TIPOS_CLIENTE;

export const TIPOS_SOLICITUD = {
  cotizacion: 'Cotización de impresión 3D',
  diseno_cad: 'Solicitud de diseño CAD',
  contacto: 'Mensaje de contacto',
  empresa: 'Solicitud empresarial (B2B)',
  educacion: 'Solicitud educativa',
} as const;
export type TipoSolicitud = keyof typeof TIPOS_SOLICITUD;

export interface DatosContacto {
  nombre: string;
  correo: string;
  telefono?: string;
  tipoCliente: TipoCliente;
  ciudad?: string;
}

/** Campos adicionales del formulario empresarial. */
export interface DatosEmpresa {
  empresa: string;
  nit?: string;
  sector?: string;
  tipoPieza?: string;
  cantidad?: string;
  urgencia?: string;
  /** Datos de facturación */
  razonSocial?: string;
  correoFacturacion?: string;
  direccionFacturacion?: string;
}

export interface RespuestaSolicitud {
  ok: boolean;
  codigo?: string;
  /** true cuando el sitio está en modo demo y nada se envió ni guardó. */
  demo?: boolean;
  mensaje?: string;
  errores?: Record<string, string>;
  /** Solo en cotizaciones: total recalculado en el servidor. */
  total?: number;
}
