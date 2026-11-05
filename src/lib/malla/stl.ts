/**
 * Lector de STL binario y ASCII. Puro (sin DOM): funciona en el navegador,
 * en el Worker de Cloudflare y en las pruebas.
 */
import { ErrorMalla, type Malla } from './tipos';

const TAM_CABECERA = 80;
const TAM_TRIANGULO = 50;

export function esStlBinario(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < TAM_CABECERA + 4) return false;
  const n = new DataView(buffer).getUint32(TAM_CABECERA, true);
  const esperado = TAM_CABECERA + 4 + n * TAM_TRIANGULO;
  if (esperado === buffer.byteLength) return true;
  // Muchos exportadores escriben "solid" en la cabecera de archivos binarios:
  // si el texto inicial no parece ASCII, se acepta como binario aunque sobren bytes.
  const inicio = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength)));
  const pareceAscii = /^\s*solid[\s\S]*facet/i.test(inicio);
  return !pareceAscii && esperado <= buffer.byteLength && n > 0;
}

export function leerStl(buffer: ArrayBuffer): Malla {
  return esStlBinario(buffer) ? leerStlBinario(buffer) : leerStlAscii(buffer);
}

function leerStlBinario(buffer: ArrayBuffer): Malla {
  const vista = new DataView(buffer);
  const n = vista.getUint32(TAM_CABECERA, true);
  if (n === 0) throw new ErrorMalla('El archivo STL no contiene triángulos.', 'vacio');
  const posiciones = new Float32Array(n * 9);
  let desplazamiento = TAM_CABECERA + 4;
  for (let i = 0; i < n; i++) {
    // Se ignora la normal (12 bytes): se recalcula a partir de los vértices.
    let p = desplazamiento + 12;
    for (let j = 0; j < 9; j++) {
      posiciones[i * 9 + j] = vista.getFloat32(p, true);
      p += 4;
    }
    desplazamiento += TAM_TRIANGULO;
  }
  validarNumeros(posiciones);
  return { posiciones, triangulos: n };
}

const RE_VERTICE = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;

function leerStlAscii(buffer: ArrayBuffer): Malla {
  const texto = new TextDecoder().decode(buffer);
  if (!/^\s*solid/i.test(texto)) {
    throw new ErrorMalla('No reconocemos el formato del archivo STL.', 'formato');
  }
  const valores: number[] = [];
  for (const m of texto.matchAll(RE_VERTICE)) {
    valores.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if (valores.length === 0) throw new ErrorMalla('El archivo STL no contiene triángulos.', 'vacio');
  if (valores.length % 9 !== 0) throw new ErrorMalla('El archivo STL está incompleto o dañado.', 'corrupto');
  const posiciones = Float32Array.from(valores);
  validarNumeros(posiciones);
  return { posiciones, triangulos: posiciones.length / 9 };
}

function validarNumeros(posiciones: Float32Array) {
  for (let i = 0; i < posiciones.length; i++) {
    if (!Number.isFinite(posiciones[i])) {
      throw new ErrorMalla('El archivo contiene coordenadas inválidas.', 'corrupto');
    }
  }
}
