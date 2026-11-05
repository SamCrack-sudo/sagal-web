import { describe, expect, it } from 'vitest';
import { cotizar, descuentoPorCantidad, ErrorCotizacion, redondear, volumenEfectivo, formatoCOP, type EntradaCotizacion } from './motor';
import type { ConfigPrecios } from './tipos';
import { configPreciosInicial } from '@/config/precios';

/** Configuración con números simples para poder verificar a mano. */
function configPrueba(cambios: Partial<ConfigPrecios> = {}): ConfigPrecios {
  return {
    moneda: 'COP',
    esDemo: false,
    desperdicio: 0,
    paredes: { lineas: 1, anchoLineaMm: 1 },
    rellenos: [0.5, 1],
    rellenoPorDefecto: 0.5,
    caudalCm3PorHora: 10,
    factorCalibracion: 1,
    horasMinimasPorPieza: 0,
    tarifaMaquinaHora: 100,
    preparacionPorPedido: 0,
    recargoCambioColor: 50,
    maxColores: 4,
    margen: 0,
    pedidoMinimo: 0,
    descuentosCantidad: [],
    iva: { cobrar: false, tasa: 0.19 },
    redondeo: 0,
    entrega: { horasMaquinaPorDia: 10, diasPreparacion: 0 },
    materiales: [
      { id: 'm', nombre: 'M', descripcion: '', usos: '', densidad: 1, precioKg: 1000, factorVelocidad: 1, permiteMulticolor: true, colores: ['a', 'b', 'c'], activo: true },
      { id: 'flex', nombre: 'Flex', descripcion: '', usos: '', densidad: 1, precioKg: 1000, factorVelocidad: 0.5, permiteMulticolor: false, colores: ['a'], activo: true },
      { id: 'viejo', nombre: 'Viejo', descripcion: '', usos: '', densidad: 1, precioKg: 1000, factorVelocidad: 1, permiteMulticolor: true, colores: ['a'], activo: false },
    ],
    colores: [
      { id: 'a', nombre: 'A', hex: '#000', activo: true },
      { id: 'b', nombre: 'B', hex: '#111', activo: true },
      { id: 'c', nombre: 'C', hex: '#222', activo: true },
    ],
    calidades: [
      { id: 'q', nombre: 'Q', alturaCapaMm: 0.2, factorVelocidad: 1, descripcion: '', activo: true },
      { id: 'fina', nombre: 'Fina', alturaCapaMm: 0.1, factorVelocidad: 0.5, descripcion: '', activo: true },
    ],
    posprocesados: [
      { id: 'no', nombre: 'No', descripcion: '', costoPorPieza: 0, diasExtra: 0, activo: true },
      { id: 'lija', nombre: 'Lija', descripcion: '', costoPorPieza: 7, diasExtra: 2, activo: true },
    ],
    urgencias: [
      { id: 'n', nombre: 'Normal', descripcion: '', recargo: 0, factorPlazo: 1, activo: true },
      { id: 'u', nombre: 'Urgente', descripcion: '', recargo: 0.5, factorPlazo: 0.5, activo: true },
    ],
    ...cambios,
  };
}

/** Cubo de 10 mm: V = 1000 mm³, A = 600 mm². */
const base: EntradaCotizacion = {
  volumenMm3: 1000,
  areaMm2: 600,
  materialId: 'm',
  colores: ['a'],
  calidadId: 'q',
  relleno: 0.5,
  cantidad: 1,
  posprocesadoId: 'no',
  urgenciaId: 'n',
};

describe('volumen efectivo', () => {
  it('suma paredes macizas y el interior según el relleno', () => {
    // paredes = 600 × 1 × 1 = 600 mm³; interior = 400 × 0,5 = 200
    expect(volumenEfectivo(1000, 600, 0.5, { lineas: 1, anchoLineaMm: 1 })).toBe(800);
  });

  it('con relleno 100 % es el volumen completo', () => {
    expect(volumenEfectivo(1000, 600, 1, { lineas: 2, anchoLineaMm: 0.4 })).toBe(1000);
  });

  it('una pieza delgada es toda pared: nunca supera el volumen real', () => {
    expect(volumenEfectivo(1000, 5000, 0.1, { lineas: 2, anchoLineaMm: 0.4 })).toBe(1000);
  });
});

describe('motor de precios', () => {
  it('calcula gramos, horas y costos de una pieza', () => {
    const r = cotizar(base, configPrueba());
    expect(r.pieza.volumenEfectivoCm3).toBeCloseTo(0.8, 10);
    expect(r.pieza.gramos).toBeCloseTo(0.8, 10); // 0,8 cm³ × 1 g/cm³
    expect(r.pieza.horas).toBeCloseTo(0.08, 10); // 0,8 / 10 cm³/h
    expect(r.pieza.costoMaterial).toBeCloseTo(0.8, 10); // 1 COP/g
    expect(r.pieza.costoMaquina).toBeCloseTo(8, 10); // 0,08 h × 100
    expect(r.pedido.subtotal).toBe(9); // 8,8 redondeado sin paso
  });

  it('aplica densidad y desperdicio a los gramos', () => {
    const c = configPrueba({ desperdicio: 0.1 });
    c.materiales[0]!.densidad = 1.24;
    const r = cotizar({ ...base, relleno: 1 }, c);
    expect(r.pieza.gramos).toBeCloseTo(1 * 1.24 * 1.1, 10);
  });

  it('las horas dependen de la calidad, el material y la calibración', () => {
    const c = configPrueba({ factorCalibracion: 1.5 });
    const fina = cotizar({ ...base, calidadId: 'fina' }, c);
    expect(fina.pieza.horas).toBeCloseTo((0.8 / (10 * 0.5)) * 1.5, 10);
    const flex = cotizar({ ...base, materialId: 'flex' }, configPrueba());
    expect(flex.pieza.horas).toBeCloseTo(0.8 / 5, 10);
  });

  it('respeta las horas mínimas por pieza', () => {
    const r = cotizar(base, configPrueba({ horasMinimasPorPieza: 0.5 }));
    expect(r.pieza.horas).toBe(0.5);
  });

  it('aplica la fórmula completa en el orden definido', () => {
    const c = configPrueba({
      preparacionPorPedido: 100,
      margen: 0.5,
      descuentosCantidad: [{ desde: 10, descuento: 0.1 }],
    });
    const r = cotizar({ ...base, cantidad: 10, urgenciaId: 'u', posprocesadoId: 'lija' }, c);
    const costoPieza = 0.8 + 8 + 7; // material + máquina + lijado
    const costo = costoPieza * 10 + 100;
    expect(r.pedido.costo).toBeCloseTo(costo, 8);
    expect(r.pedido.conMargen).toBeCloseTo(costo * 1.5, 8);
    expect(r.pedido.descuento).toBe(0.1);
    const esperado = costo * 1.5 * 0.9 * 1.5;
    expect(r.pedido.subtotal).toBe(Math.round(esperado));
    expect(r.pedido.total).toBe(r.pedido.subtotal);
    expect(r.precioUnitario).toBeCloseTo(r.pedido.total / 10, 8);
  });

  it('aplica el pedido mínimo y lo advierte', () => {
    const r = cotizar(base, configPrueba({ pedidoMinimo: 20000, redondeo: 100 }));
    expect(r.pedido.aplicaMinimo).toBe(true);
    expect(r.pedido.subtotal).toBe(20000);
    expect(r.advertencias.join(' ')).toMatch(/mínimo/);
  });

  it('el pedido mínimo se aplica antes del descuento y la urgencia', () => {
    const c = configPrueba({ pedidoMinimo: 1000, descuentosCantidad: [{ desde: 2, descuento: 0.2 }] });
    const r = cotizar({ ...base, cantidad: 2, urgenciaId: 'u' }, c);
    expect(r.pedido.subtotal).toBe(Math.round(1000 * 0.8 * 1.5));
  });

  it('cobra IVA solo si está activado', () => {
    const sin = cotizar(base, configPrueba({ pedidoMinimo: 10000 }));
    expect(sin.pedido.iva).toBe(0);
    const con = cotizar(base, configPrueba({ pedidoMinimo: 10000, iva: { cobrar: true, tasa: 0.19 } }));
    expect(con.pedido.iva).toBe(1900);
    expect(con.pedido.total).toBe(11900);
  });

  it('redondea los valores finales al paso configurado', () => {
    const r = cotizar(base, configPrueba({ pedidoMinimo: 12345, redondeo: 100 }));
    expect(r.pedido.subtotal).toBe(12300);
    expect(redondear(12350, 100)).toBe(12400);
  });

  it('cobra los cambios de color del AMS por pieza', () => {
    const r = cotizar({ ...base, colores: ['a', 'b', 'c'], cantidad: 3 }, configPrueba());
    expect(r.pieza.costoColor).toBe(100); // 2 cambios × 50
    expect(r.pedido.costoColor).toBe(300);
  });

  it('calcula los días hábiles de entrega', () => {
    const c = configPrueba({ horasMinimasPorPieza: 4, entrega: { horasMaquinaPorDia: 10, diasPreparacion: 1 } });
    // 5 piezas × 4 h = 20 h → 2 días + 1 de preparación + 2 de lijado = 5
    const normal = cotizar({ ...base, cantidad: 5, posprocesadoId: 'lija' }, c);
    expect(normal.entrega.horasMaquina).toBe(20);
    expect(normal.entrega.diasHabiles).toBe(5);
    const urgente = cotizar({ ...base, cantidad: 5, posprocesadoId: 'lija', urgenciaId: 'u' }, c);
    expect(urgente.entrega.diasHabiles).toBe(3); // ceil(5 × 0,5)
  });
});

describe('validación de la entrada', () => {
  const c = configPrueba();
  const casos: [Partial<EntradaCotizacion>, keyof EntradaCotizacion][] = [
    [{ materialId: 'viejo' }, 'materialId'],
    [{ materialId: 'inexistente' }, 'materialId'],
    [{ cantidad: 0 }, 'cantidad'],
    [{ cantidad: 1.5 }, 'cantidad'],
    [{ relleno: 0 }, 'relleno'],
    [{ relleno: 1.2 }, 'relleno'],
    [{ colores: [] }, 'colores'],
    [{ colores: ['a', 'a'] }, 'colores'],
    [{ colores: ['z'] }, 'colores'],
    [{ materialId: 'flex', colores: ['a', 'b'] }, 'colores'],
    [{ volumenMm3: 0 }, 'volumenMm3'],
    [{ calidadId: 'x' }, 'calidadId'],
    [{ urgenciaId: 'x' }, 'urgenciaId'],
    [{ posprocesadoId: 'x' }, 'posprocesadoId'],
  ];
  for (const [cambio, campo] of casos) {
    it(`rechaza ${JSON.stringify(cambio)}`, () => {
      try {
        cotizar({ ...base, ...cambio }, c);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(ErrorCotizacion);
        expect((e as ErrorCotizacion).campo).toBe(campo);
      }
    });
  }
});

describe('utilidades', () => {
  it('elige el descuento del tramo más alto alcanzado', () => {
    const tabla = [{ desde: 10, descuento: 0.1 }, { desde: 5, descuento: 0.05 }];
    expect(descuentoPorCantidad(4, tabla)).toBe(0);
    expect(descuentoPorCantidad(5, tabla)).toBe(0.05);
    expect(descuentoPorCantidad(50, tabla)).toBe(0.1);
  });

  it('formatea pesos colombianos sin decimales', () => {
    expect(formatoCOP(12300).replace(/\s/g, ' ')).toMatch(/\$ ?12\.300/);
  });
});

describe('configuración inicial', () => {
  const c = configPreciosInicial;
  it('es coherente: colores, relleno por defecto y opciones activas', () => {
    for (const m of c.materiales) for (const col of m.colores) expect(c.colores.some((x) => x.id === col)).toBe(true);
    expect(c.rellenos).toContain(c.rellenoPorDefecto);
    expect(c.urgencias.some((u) => u.activo && u.recargo === 0)).toBe(true);
    expect(c.posprocesados.some((p) => p.activo && p.costoPorPieza === 0)).toBe(true);
  });

  it('cotiza un cubo de 20 mm con todos los materiales activos', () => {
    for (const m of c.materiales.filter((x) => x.activo)) {
      const r = cotizar(
        { ...base, volumenMm3: 8000, areaMm2: 2400, materialId: m.id, colores: [m.colores[0]!], calidadId: 'estandar', relleno: c.rellenoPorDefecto, posprocesadoId: 'ninguno', urgenciaId: 'normal' },
        c,
      );
      expect(r.pedido.total).toBeGreaterThanOrEqual(c.pedidoMinimo);
      expect(r.entrega.diasHabiles).toBeGreaterThanOrEqual(1);
    }
  });
});
