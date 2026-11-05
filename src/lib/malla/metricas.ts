/**
 * Métricas geométricas de una malla: volumen (tetraedros con signo), área,
 * caja límite y verificación contra el volumen de impresión.
 */
import type { CajaLimite, Malla, MetricasMalla, Vec3 } from './tipos';

export function calcularMetricas(malla: Malla): MetricasMalla {
  const p = malla.posiciones;
  let volumen6 = 0;
  let area2 = 0;
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i]!,
      ay = p[i + 1]!,
      az = p[i + 2]!;
    const bx = p[i + 3]!,
      by = p[i + 4]!,
      bz = p[i + 5]!;
    const cx = p[i + 6]!,
      cy = p[i + 7]!,
      cz = p[i + 8]!;

    // Volumen con signo del tetraedro (origen, a, b, c) × 6 = a · (b × c)
    volumen6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);

    // Área = |(b − a) × (c − a)| / 2
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az;
    const vx = cx - ax,
      vy = cy - ay,
      vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    area2 += Math.sqrt(nx * nx + ny * ny + nz * nz);

    if (ax < minX) minX = ax;
    if (bx < minX) minX = bx;
    if (cx < minX) minX = cx;
    if (ay < minY) minY = ay;
    if (by < minY) minY = by;
    if (cy < minY) minY = cy;
    if (az < minZ) minZ = az;
    if (bz < minZ) minZ = bz;
    if (cz < minZ) minZ = cz;
    if (ax > maxX) maxX = ax;
    if (bx > maxX) maxX = bx;
    if (cx > maxX) maxX = cx;
    if (ay > maxY) maxY = ay;
    if (by > maxY) maxY = by;
    if (cy > maxY) maxY = cy;
    if (az > maxZ) maxZ = az;
    if (bz > maxZ) maxZ = bz;
    if (cz > maxZ) maxZ = cz;
  }

  const vacia = p.length === 0;
  const caja: CajaLimite = vacia
    ? { min: [0, 0, 0], max: [0, 0, 0], tamano: [0, 0, 0] }
    : {
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
        tamano: [maxX - minX, maxY - minY, maxZ - minZ],
      };

  return {
    volumenMm3: Math.abs(volumen6) / 6,
    areaMm2: area2 / 2,
    caja,
    triangulos: malla.triangulos,
    orientacionInvertida: volumen6 < 0,
  };
}

export interface VerificacionVolumen {
  /** Cabe tal como viene orientada. */
  cabe: boolean;
  /** Cabe si se rota 90° sobre algún eje (permutando ejes). */
  cabeRotada: boolean;
  /** Ejes que exceden el volumen en la orientación original. */
  excesos: { eje: 'X' | 'Y' | 'Z'; medida: number; limite: number }[];
}

export function verificarVolumen(tamano: Vec3, limite: { x: number; y: number; z: number }): VerificacionVolumen {
  const lim: Vec3 = [limite.x, limite.y, limite.z];
  const ejes = ['X', 'Y', 'Z'] as const;
  const excesos = tamano
    .map((medida, i) => ({ eje: ejes[i]!, medida, limite: lim[i]! }))
    .filter((e) => e.medida > e.limite + 1e-6);
  const ordenado = [...tamano].sort((a, b) => a - b);
  const limOrdenado = [...lim].sort((a, b) => a - b);
  const cabeRotada = ordenado.every((m, i) => m <= limOrdenado[i]! + 1e-6);
  return { cabe: excesos.length === 0, cabeRotada, excesos };
}

/**
 * Una malla con volumen casi nulo respecto a su caja suele estar abierta
 * (no es un sólido cerrado) y el volumen calculado no es confiable.
 */
export function volumenSospechoso(m: MetricasMalla): boolean {
  const [x, y, z] = m.caja.tamano;
  const volCaja = x * y * z;
  return m.volumenMm3 <= 0 || (volCaja > 0 && m.volumenMm3 / volCaja < 0.002);
}
