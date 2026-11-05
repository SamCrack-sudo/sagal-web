/**
 * Punto de entrada para leer modelos 3D. Detecta el formato por la firma del
 * archivo (ZIP → 3MF) y, en su defecto, por la extensión.
 */
import { leerStl } from './stl';
import { leer3mf } from './tresmf';
import { ErrorMalla, type Malla } from './tipos';

export * from './tipos';
export {
  calcularMetricas,
  verificarVolumen,
  volumenSospechoso,
  escalarMetricas,
  UNIDADES_ARCHIVO,
  type UnidadArchivo,
} from './metricas';

export const EXTENSIONES_MODELO = ['.stl', '.3mf'] as const;
/** Tamaño máximo de archivo de modelo aceptado (bytes). */
export const TAM_MAX_MODELO = 50 * 1024 * 1024;

export function extensionDe(nombre: string): string {
  const i = nombre.lastIndexOf('.');
  return i >= 0 ? nombre.slice(i).toLowerCase() : '';
}

export function esZip(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const b = new Uint8Array(buffer, 0, 4);
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export function leerModelo(nombre: string, buffer: ArrayBuffer): Malla {
  if (buffer.byteLength === 0) throw new ErrorMalla('El archivo está vacío.', 'vacio');
  if (buffer.byteLength > TAM_MAX_MODELO) {
    throw new ErrorMalla(`El archivo supera el máximo de ${TAM_MAX_MODELO / 1024 / 1024} MB.`, 'tamano');
  }
  const ext = extensionDe(nombre);
  if (esZip(buffer)) {
    if (ext && ext !== '.3mf') throw new ErrorMalla('El archivo parece un ZIP; solo aceptamos 3MF y STL.', 'formato');
    return leer3mf(buffer);
  }
  if (ext === '.3mf') throw new ErrorMalla('El archivo 3MF está dañado o no es un 3MF válido.', 'corrupto');
  if (ext === '.stl' || ext === '') return leerStl(buffer);
  throw new ErrorMalla('Formato no soportado. Sube un archivo STL o 3MF.', 'formato');
}
