/**
 * Validación de formularios, compartida entre el navegador (mensajes inmediatos)
 * y el servidor (fuente de verdad). Pura: sin DOM ni red.
 */
import { TIPOS_CLIENTE, type DatosContacto, type DatosEmpresa, type TipoCliente } from './tipos';

export type Errores = Record<string, string>;

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const LIMITES = {
  nombre: 120,
  correo: 160,
  telefono: 30,
  texto: 4000,
  corto: 160,
} as const;

/** Lee un campo de texto: recorta espacios y limita la longitud. */
export function texto(valor: unknown, max: number = LIMITES.corto): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

/** Normaliza un teléfono colombiano a formato internacional sin "+" (57XXXXXXXXXX). */
export function normalizarTelefono(valor: string): string {
  const d = valor.replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('3')) return `57${d}`;
  return d;
}

export function validarContacto(campos: Record<string, unknown>): { datos: DatosContacto; errores: Errores } {
  const errores: Errores = {};
  const nombre = texto(campos.nombre, LIMITES.nombre);
  const correo = texto(campos.correo, LIMITES.correo).toLowerCase();
  const telefono = texto(campos.telefono, LIMITES.telefono);
  const tipo = texto(campos.tipoCliente) || 'persona';
  const ciudad = texto(campos.ciudad);

  if (nombre.length < 2) errores.nombre = 'Escribe tu nombre.';
  if (!RE_CORREO.test(correo)) errores.correo = 'Escribe un correo válido.';
  if (telefono) {
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.length < 7 || digitos.length > 15) errores.telefono = 'Escribe un número de teléfono válido.';
  }
  if (!(tipo in TIPOS_CLIENTE)) errores.tipoCliente = 'Elige un tipo de cliente.';
  if (campos.consentimiento !== true && campos.consentimiento !== 'true' && campos.consentimiento !== 'on') {
    errores.consentimiento = 'Debes aceptar la política de tratamiento de datos para continuar.';
  }

  return {
    datos: {
      nombre,
      correo,
      telefono: telefono || undefined,
      tipoCliente: tipo as TipoCliente,
      ciudad: ciudad || undefined,
    },
    errores,
  };
}

export function validarEmpresa(campos: Record<string, unknown>): { datos: DatosEmpresa; errores: Errores } {
  const errores: Errores = {};
  const datos: DatosEmpresa = {
    empresa: texto(campos.empresa),
    nit: texto(campos.nit, 30) || undefined,
    sector: texto(campos.sector) || undefined,
    tipoPieza: texto(campos.tipoPieza) || undefined,
    cantidad: texto(campos.cantidad, 40) || undefined,
    urgencia: texto(campos.urgencia, 60) || undefined,
    razonSocial: texto(campos.razonSocial) || undefined,
    correoFacturacion: texto(campos.correoFacturacion, LIMITES.correo).toLowerCase() || undefined,
    direccionFacturacion: texto(campos.direccionFacturacion, 240) || undefined,
  };
  if (datos.empresa.length < 2) errores.empresa = 'Escribe el nombre de la empresa.';
  if (datos.nit && !/^[\d.\s-]{6,20}$/.test(datos.nit)) errores.nit = 'Escribe el NIT solo con números (con o sin dígito de verificación).';
  if (datos.correoFacturacion && !RE_CORREO.test(datos.correoFacturacion)) {
    errores.correoFacturacion = 'Escribe un correo de facturación válido.';
  }
  return { datos, errores };
}

/** Campo trampa para bots: debe llegar vacío. */
export function esSpam(campos: Record<string, unknown>): boolean {
  return texto(campos.sitio_web).length > 0;
}

export interface ReglaArchivo {
  extensiones: string[];
  tamMaxBytes: number;
  maxArchivos: number;
}

export const REGLAS_ADJUNTOS: ReglaArchivo = {
  extensiones: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf', '.stl', '.3mf', '.step', '.stp', '.dxf', '.dwg'],
  tamMaxBytes: 10 * 1024 * 1024,
  maxArchivos: 5,
};

export const REGLAS_FOTOS: ReglaArchivo = {
  extensiones: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf'],
  tamMaxBytes: 10 * 1024 * 1024,
  maxArchivos: 5,
};

export function validarArchivos(
  archivos: { name: string; size: number }[],
  regla: ReglaArchivo,
): string | null {
  if (archivos.length > regla.maxArchivos) return `Puedes adjuntar máximo ${regla.maxArchivos} archivos.`;
  for (const a of archivos) {
    const ext = a.name.slice(a.name.lastIndexOf('.')).toLowerCase();
    if (!regla.extensiones.includes(ext)) return `El archivo "${a.name}" no tiene un formato permitido.`;
    if (a.size > regla.tamMaxBytes) return `El archivo "${a.name}" supera ${regla.tamMaxBytes / 1024 / 1024} MB.`;
  }
  return null;
}
