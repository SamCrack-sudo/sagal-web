/**
 * Lector de 3MF (ZIP + XML). Soporta:
 * - objetos con malla y objetos compuestos (<components>), incluida la extensión
 *   de producción (p:path) que usan Bambu Studio, PrusaSlicer y otros,
 * - transformaciones de componentes y de elementos de construcción (<build><item>),
 * - unidades del modelo (micron, millimeter, centimeter, inch, foot, meter).
 * No usa DOMParser para poder ejecutarse también en el Worker.
 */
import { unzipSync, strFromU8 } from 'fflate';
import { ErrorMalla, type Malla } from './tipos';

/** Matriz afín 4×3 de 3MF en orden de fila: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32. */
type Matriz = number[];

const IDENTIDAD: Matriz = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

const UNIDADES: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

interface Componente {
  objeto: string;
  ruta: string;
  transformacion: Matriz;
}

interface ObjetoModelo {
  vertices?: Float64Array;
  indices?: Uint32Array;
  componentes: Componente[];
}

interface Modelo {
  escala: number;
  objetos: Map<string, ObjetoModelo>;
  items: Componente[];
}

const MAX_PROFUNDIDAD = 16;

export function leer3mf(buffer: ArrayBuffer): Malla {
  let archivos: Record<string, Uint8Array>;
  try {
    archivos = unzipSync(new Uint8Array(buffer), {
      filter: (f) => f.name.toLowerCase().endsWith('.model'),
    });
  } catch {
    throw new ErrorMalla('El archivo 3MF está dañado o no es un ZIP válido.', 'corrupto');
  }

  const modelos = new Map<string, Modelo>();
  for (const [nombre, datos] of Object.entries(archivos)) {
    modelos.set(normalizarRuta(nombre), leerModeloXml(strFromU8(datos), normalizarRuta(nombre)));
  }
  if (modelos.size === 0) throw new ErrorMalla('El archivo 3MF no contiene ningún modelo.', 'vacio');

  const rutaPrincipal =
    [...modelos.keys()].find((r) => r.toLowerCase() === '/3d/3dmodel.model') ??
    [...modelos.entries()].find(([, m]) => m.items.length > 0)?.[0] ??
    [...modelos.keys()][0]!;
  const principal = modelos.get(rutaPrincipal)!;

  const salida: number[] = [];
  const items =
    principal.items.length > 0
      ? principal.items
      : [...principal.objetos.keys()].map((id) => ({ objeto: id, ruta: rutaPrincipal, transformacion: IDENTIDAD }));

  for (const item of items) {
    agregarObjeto(modelos, item.ruta, item.objeto, item.transformacion, salida, 0);
  }

  if (salida.length === 0) throw new ErrorMalla('El archivo 3MF no contiene triángulos.', 'vacio');
  return { posiciones: Float32Array.from(salida), triangulos: salida.length / 9 };
}

function agregarObjeto(
  modelos: Map<string, Modelo>,
  ruta: string,
  id: string,
  transformacion: Matriz,
  salida: number[],
  profundidad: number,
) {
  if (profundidad > MAX_PROFUNDIDAD) throw new ErrorMalla('El archivo 3MF tiene referencias circulares.', 'corrupto');
  const modelo = modelos.get(ruta);
  const objeto = modelo?.objetos.get(id);
  if (!modelo || !objeto) return;

  // La escala de unidades se aplica a las coordenadas antes de cualquier transformación.
  if (objeto.vertices && objeto.indices) {
    const v = objeto.vertices;
    const s = modelo.escala;
    for (let i = 0; i < objeto.indices.length; i++) {
      const k = objeto.indices[i]! * 3;
      const x = v[k]! * s;
      const y = v[k + 1]! * s;
      const z = v[k + 2]! * s;
      const t = transformacion;
      salida.push(
        x * t[0]! + y * t[3]! + z * t[6]! + t[9]! * s,
        x * t[1]! + y * t[4]! + z * t[7]! + t[10]! * s,
        x * t[2]! + y * t[5]! + z * t[8]! + t[11]! * s,
      );
    }
  }

  for (const c of objeto.componentes) {
    agregarObjeto(modelos, c.ruta, c.objeto, componer(c.transformacion, transformacion), salida, profundidad + 1);
  }
}

/** Devuelve la matriz que aplica primero `a` y luego `b`. */
export function componer(a: Matriz, b: Matriz): Matriz {
  const r: Matriz = new Array(12).fill(0);
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 3; col++) {
      let suma = fila === 3 ? b[9 + col]! : 0;
      for (let k = 0; k < 3; k++) suma += a[fila * 3 + k]! * b[k * 3 + col]!;
      r[fila * 3 + col] = suma;
    }
  }
  return r;
}

function leerModeloXml(xml: string, rutaActual: string): Modelo {
  const unidad = /<model\b[^>]*\bunit="([^"]+)"/.exec(xml)?.[1]?.toLowerCase() ?? 'millimeter';
  const escala = UNIDADES[unidad] ?? 1;
  const objetos = new Map<string, ObjetoModelo>();

  for (const m of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
    const id = atributo(m[1]!, 'id');
    if (!id) continue;
    const cuerpo = m[2]!;
    const objeto: ObjetoModelo = { componentes: [] };

    const malla = /<mesh\b[^>]*>([\s\S]*?)<\/mesh>/.exec(cuerpo)?.[1];
    if (malla) {
      const vertices: number[] = [];
      for (const v of malla.matchAll(/<vertex\b([^>]*?)\/?>/g)) {
        vertices.push(Number(atributo(v[1]!, 'x')), Number(atributo(v[1]!, 'y')), Number(atributo(v[1]!, 'z')));
      }
      const indices: number[] = [];
      const nVertices = vertices.length / 3;
      for (const t of malla.matchAll(/<triangle\b([^>]*?)\/?>/g)) {
        const a = Number(atributo(t[1]!, 'v1'));
        const b = Number(atributo(t[1]!, 'v2'));
        const c = Number(atributo(t[1]!, 'v3'));
        if ([a, b, c].some((n) => !Number.isInteger(n) || n < 0 || n >= nVertices)) {
          throw new ErrorMalla('El archivo 3MF tiene triángulos con vértices inexistentes.', 'corrupto');
        }
        indices.push(a, b, c);
      }
      if (vertices.some((n) => !Number.isFinite(n))) {
        throw new ErrorMalla('El archivo 3MF contiene coordenadas inválidas.', 'corrupto');
      }
      objeto.vertices = Float64Array.from(vertices);
      objeto.indices = Uint32Array.from(indices);
    }

    for (const c of cuerpo.matchAll(/<component\b([^>]*?)\/?>/g)) {
      const ref = atributo(c[1]!, 'objectid');
      if (!ref) continue;
      objeto.componentes.push({
        objeto: ref,
        ruta: normalizarRuta(atributo(c[1]!, 'p:path') ?? rutaActual),
        transformacion: leerMatriz(atributo(c[1]!, 'transform')),
      });
    }
    objetos.set(id, objeto);
  }

  const items: Componente[] = [];
  const build = /<build\b[^>]*>([\s\S]*?)<\/build>/.exec(xml)?.[1] ?? '';
  for (const it of build.matchAll(/<item\b([^>]*?)\/?>/g)) {
    const ref = atributo(it[1]!, 'objectid');
    if (!ref) continue;
    // Los elementos marcados como no imprimibles no cuentan.
    if (atributo(it[1]!, 'printable') === '0') continue;
    items.push({
      objeto: ref,
      ruta: normalizarRuta(atributo(it[1]!, 'p:path') ?? rutaActual),
      transformacion: leerMatriz(atributo(it[1]!, 'transform')),
    });
  }

  return { escala, objetos, items };
}

function atributo(texto: string, nombre: string): string | undefined {
  const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escapado}="([^"]*)"`).exec(texto)?.[1];
}

function leerMatriz(texto: string | undefined): Matriz {
  if (!texto) return IDENTIDAD;
  const n = texto.trim().split(/\s+/).map(Number);
  if (n.length !== 12 || n.some((x) => !Number.isFinite(x))) return IDENTIDAD;
  return n;
}

function normalizarRuta(ruta: string): string {
  return ruta.startsWith('/') ? ruta : `/${ruta}`;
}
