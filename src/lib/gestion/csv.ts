/**
 * Exportación a CSV pensada para Excel en español (Colombia):
 * separador punto y coma, BOM UTF-8 para que respete las tildes, y
 * protección contra inyección de fórmulas (=, +, -, @ al inicio).
 */
export interface Columna<T> {
  titulo: string;
  valor: (fila: T) => string | number | boolean | null | undefined;
}

const SEPARADOR = ';';

export function celda(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  let texto = typeof valor === 'number' ? String(valor).replace('.', ',') : String(valor);
  if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[";\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function aCsv<T>(columnas: Columna<T>[], filas: T[]): string {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(SEPARADOR)];
  for (const f of filas) lineas.push(columnas.map((c) => celda(c.valor(f))).join(SEPARADOR));
  return `﻿${lineas.join('\r\n')}\r\n`;
}
