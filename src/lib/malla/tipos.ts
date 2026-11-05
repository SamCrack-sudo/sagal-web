/**
 * Malla triangular no indexada: 9 números (3 vértices × xyz) por triángulo, en mm.
 * Es el formato común que producen los lectores de STL y 3MF, y el que consumen
 * el cálculo de métricas, el motor de precios y el visor 3D.
 */
export interface Malla {
  posiciones: Float32Array;
  triangulos: number;
}

export type Vec3 = [number, number, number];

export interface CajaLimite {
  min: Vec3;
  max: Vec3;
  /** Tamaño en mm: ancho (X), fondo (Y), alto (Z). */
  tamano: Vec3;
}

export interface MetricasMalla {
  /** Volumen encerrado en mm³ (método de tetraedros con signo, valor absoluto). */
  volumenMm3: number;
  /** Área de superficie en mm². */
  areaMm2: number;
  caja: CajaLimite;
  triangulos: number;
  /**
   * true si los triángulos tenían la orientación invertida (volumen con signo
   * negativo). Se informa, pero el volumen se toma en valor absoluto.
   */
  orientacionInvertida: boolean;
}

export class ErrorMalla extends Error {
  constructor(
    message: string,
    public readonly codigo: 'formato' | 'vacio' | 'corrupto' | 'tamano',
  ) {
    super(message);
    this.name = 'ErrorMalla';
  }
}
