import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { calcularMetricas, leerModelo, verificarVolumen, volumenSospechoso, ErrorMalla } from './index';
import { leerStl, esStlBinario } from './stl';
import { leer3mf, componer } from './tresmf';

// ── Utilidades de prueba ──────────────────────────────────────────────────
type Tri = [number[], number[], number[]];

/** Cubo de lado `l` con esquina en el origen, normales hacia afuera (12 triángulos). */
function cubo(l = 10): Tri[] {
  const v = [
    [0, 0, 0],
    [l, 0, 0],
    [l, l, 0],
    [0, l, 0],
    [0, 0, l],
    [l, 0, l],
    [l, l, l],
    [0, l, l],
  ];
  const caras = [
    [0, 2, 1], [0, 3, 2], // abajo
    [4, 5, 6], [4, 6, 7], // arriba
    [0, 1, 5], [0, 5, 4], // frente
    [2, 3, 7], [2, 7, 6], // atrás
    [1, 2, 6], [1, 6, 5], // derecha
    [0, 4, 7], [0, 7, 3], // izquierda
  ];
  return caras.map((c) => c.map((i) => v[i]!) as Tri);
}

function stlBinario(tris: Tri[], cabecera = 'binario de prueba'): ArrayBuffer {
  const buf = new ArrayBuffer(84 + tris.length * 50);
  const dv = new DataView(buf);
  new Uint8Array(buf).set(new TextEncoder().encode(cabecera.slice(0, 80)));
  dv.setUint32(80, tris.length, true);
  tris.forEach((t, i) => {
    let p = 84 + i * 50 + 12;
    for (const v of t) for (const c of v) {
      dv.setFloat32(p, c, true);
      p += 4;
    }
  });
  return buf;
}

function stlAscii(tris: Tri[]): ArrayBuffer {
  const lineas = ['solid prueba'];
  for (const t of tris) {
    lineas.push('  facet normal 0 0 0', '    outer loop');
    for (const v of t) lineas.push(`      vertex ${v[0]} ${v[1]} ${v[2]}`);
    lineas.push('    endloop', '  endfacet');
  }
  lineas.push('endsolid prueba');
  return new TextEncoder().encode(lineas.join('\n')).buffer as ArrayBuffer;
}

function mallaXml(l: number) {
  const v = [
    [0, 0, 0], [l, 0, 0], [l, l, 0], [0, l, 0],
    [0, 0, l], [l, 0, l], [l, l, l], [0, l, l],
  ];
  const caras = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4],
    [2, 3, 7], [2, 7, 6], [1, 2, 6], [1, 6, 5], [0, 4, 7], [0, 7, 3],
  ];
  return `<mesh><vertices>${v.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}" />`).join('')}</vertices>
<triangles>${caras.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}" />`).join('')}</triangles></mesh>`;
}

function zip3mf(archivos: Record<string, string>): ArrayBuffer {
  const entradas: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<Types/>'),
    '_rels/.rels': strToU8('<Relationships/>'),
  };
  for (const [k, v] of Object.entries(archivos)) entradas[k] = strToU8(v);
  return zipSync(entradas).buffer as ArrayBuffer;
}

// ── STL ───────────────────────────────────────────────────────────────────
describe('lector STL', () => {
  it('lee un STL binario y calcula el volumen de un cubo de 10 mm', () => {
    const malla = leerStl(stlBinario(cubo(10)));
    const m = calcularMetricas(malla);
    expect(malla.triangulos).toBe(12);
    expect(m.volumenMm3).toBeCloseTo(1000, 6);
    expect(m.areaMm2).toBeCloseTo(600, 6);
    expect(m.caja.tamano).toEqual([10, 10, 10]);
    expect(m.orientacionInvertida).toBe(false);
  });

  it('acepta STL binario cuya cabecera empieza con "solid"', () => {
    const buf = stlBinario(cubo(20), 'solid exportado por un CAD');
    expect(esStlBinario(buf)).toBe(true);
    expect(calcularMetricas(leerStl(buf)).volumenMm3).toBeCloseTo(8000, 4);
  });

  it('lee un STL ASCII', () => {
    const m = calcularMetricas(leerStl(stlAscii(cubo(5))));
    expect(m.volumenMm3).toBeCloseTo(125, 6);
    expect(m.triangulos).toBe(12);
  });

  it('da el volumen en valor absoluto si la orientación está invertida', () => {
    const invertido = cubo(10).map(([a, b, c]) => [a, c, b] as Tri);
    const m = calcularMetricas(leerStl(stlBinario(invertido)));
    expect(m.volumenMm3).toBeCloseTo(1000, 6);
    expect(m.orientacionInvertida).toBe(true);
  });

  it('el volumen no depende de la posición de la pieza', () => {
    const desplazado = cubo(10).map((t) => t.map(([x, y, z]) => [x! + 120, y! - 40, z! + 7]) as Tri);
    expect(calcularMetricas(leerStl(stlBinario(desplazado))).volumenMm3).toBeCloseTo(1000, 3);
  });

  it('calcula el volumen de un tetraedro', () => {
    const v = [[0, 0, 0], [6, 0, 0], [0, 6, 0], [0, 0, 6]];
    const tris: Tri[] = [
      [v[0]!, v[2]!, v[1]!],
      [v[0]!, v[1]!, v[3]!],
      [v[0]!, v[3]!, v[2]!],
      [v[1]!, v[2]!, v[3]!],
    ];
    expect(calcularMetricas(leerStl(stlAscii(tris))).volumenMm3).toBeCloseTo(36, 6);
  });

  it('rechaza archivos vacíos o sin triángulos', () => {
    expect(() => leerStl(stlBinario([]))).toThrow(ErrorMalla);
    expect(() => leerStl(new TextEncoder().encode('solid x\nendsolid x').buffer as ArrayBuffer)).toThrow(ErrorMalla);
  });
});

// ── 3MF ───────────────────────────────────────────────────────────────────
describe('lector 3MF', () => {
  it('lee un 3MF simple con un objeto', () => {
    const buf = zip3mf({
      '3D/3dmodel.model': `<?xml version="1.0"?><model unit="millimeter"><resources>
        <object id="1" type="model">${mallaXml(10)}</object></resources>
        <build><item objectid="1" /></build></model>`,
    });
    const m = calcularMetricas(leer3mf(buf));
    expect(m.volumenMm3).toBeCloseTo(1000, 6);
  });

  it('aplica unidades del modelo (centímetros → mm)', () => {
    const buf = zip3mf({
      '3D/3dmodel.model': `<model unit="centimeter"><resources>
        <object id="1">${mallaXml(1)}</object></resources><build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 5 0 0"/></build></model>`,
    });
    const m = calcularMetricas(leer3mf(buf));
    expect(m.volumenMm3).toBeCloseTo(1000, 4);
    expect(m.caja.min[0]).toBeCloseTo(50, 4);
  });

  it('resuelve componentes en archivos externos (extensión de producción) con escala', () => {
    const buf = zip3mf({
      '3D/3dmodel.model': `<model unit="millimeter" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06">
        <resources><object id="2" type="model"><components>
          <component p:path="/3D/Objects/object_1.model" objectid="1" transform="2 0 0 0 2 0 0 0 2 0 0 0"/>
        </components></object></resources>
        <build><item objectid="2" transform="1 0 0 0 1 0 0 0 1 100 100 0"/></build></model>`,
      '3D/Objects/object_1.model': `<model unit="millimeter"><resources><object id="1">${mallaXml(10)}</object></resources><build/></model>`,
    });
    const m = calcularMetricas(leer3mf(buf));
    expect(m.volumenMm3).toBeCloseTo(8000, 3);
    expect(m.caja.tamano).toEqual([20, 20, 20]);
    expect(m.caja.min[0]).toBeCloseTo(100, 4);
  });

  it('suma varios elementos de construcción e ignora los no imprimibles', () => {
    const buf = zip3mf({
      '3D/3dmodel.model': `<model><resources><object id="1">${mallaXml(10)}</object></resources>
        <build><item objectid="1"/><item objectid="1" transform="1 0 0 0 1 0 0 0 1 30 0 0"/>
        <item objectid="1" printable="0" transform="1 0 0 0 1 0 0 0 1 60 0 0"/></build></model>`,
    });
    expect(calcularMetricas(leer3mf(buf)).volumenMm3).toBeCloseTo(2000, 4);
  });

  it('compone transformaciones en el orden correcto', () => {
    const escala2 = [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0];
    const mover = [1, 0, 0, 0, 1, 0, 0, 0, 1, 10, 0, 0];
    // primero escalar y luego mover: la traslación no se escala
    expect(componer(escala2, mover)[9]).toBe(10);
    // primero mover y luego escalar: la traslación se duplica
    expect(componer(mover, escala2)[9]).toBe(20);
  });

  it('rechaza un ZIP sin modelos y un 3MF dañado', () => {
    expect(() => leer3mf(zip3mf({}))).toThrow(ErrorMalla);
    expect(() => leerModelo('pieza.3mf', new TextEncoder().encode('no es zip').buffer as ArrayBuffer)).toThrow(ErrorMalla);
  });
});

// ── Detección y verificación ──────────────────────────────────────────────
describe('detección de formato y volumen de impresión', () => {
  it('detecta 3MF por firma ZIP y STL por extensión', () => {
    const tres = zip3mf({ '3D/3dmodel.model': `<model><resources><object id="1">${mallaXml(10)}</object></resources><build><item objectid="1"/></build></model>` });
    expect(calcularMetricas(leerModelo('PIEZA.3MF', tres)).volumenMm3).toBeCloseTo(1000, 4);
    expect(calcularMetricas(leerModelo('pieza.stl', stlBinario(cubo(10)))).volumenMm3).toBeCloseTo(1000, 4);
    expect(() => leerModelo('pieza.obj', stlBinario(cubo(10)))).toThrow(/Formato no soportado/);
  });

  it('verifica si la pieza cabe en el volumen de impresión', () => {
    const lim = { x: 256, y: 256, z: 256 };
    expect(verificarVolumen([100, 200, 256], lim).cabe).toBe(true);
    const grande = verificarVolumen([300, 100, 100], lim);
    expect(grande.cabe).toBe(false);
    expect(grande.cabeRotada).toBe(false);
    expect(grande.excesos[0]).toMatchObject({ eje: 'X', medida: 300 });
    // En un volumen no cúbico una rotación puede hacerla caber
    const rotable = verificarVolumen([250, 100, 100], { x: 200, y: 200, z: 260 });
    expect(rotable.cabe).toBe(false);
    expect(rotable.cabeRotada).toBe(true);
  });

  it('marca como sospechosa una superficie abierta sin volumen', () => {
    const plano: Tri[] = [[[0, 0, 0], [10, 0, 0], [10, 10, 0]], [[0, 0, 0], [10, 10, 0], [0, 10, 0]]];
    const m = calcularMetricas(leerStl(stlAscii(plano)));
    expect(volumenSospechoso(m)).toBe(true);
    expect(volumenSospechoso(calcularMetricas(leerStl(stlBinario(cubo(10)))))).toBe(false);
  });
});
