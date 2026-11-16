import { describe, expect, it } from 'vitest';
import { calcularResumen, canalDeOrigen, inicioMesColombia, type FilaMetrica } from './metricas';
import { aCsv, celda } from './csv';
import { ESTADO_PARA_CLIENTE, ESTADOS, ETIQUETA_ESTADO, esEstado, siguienteEstado, yaAprobado } from './estados';
import { validarConfigPrecios, configValidaO } from '@/lib/precios/validar';
import { configPreciosInicial } from '@/config/precios';

const AHORA = new Date('2026-11-16T15:00:00Z'); // 10:00 en Colombia
const dias = (n: number) => new Date(AHORA.getTime() - n * 86_400_000).toISOString();

function fila(p: Partial<FilaMetrica>): FilaMetrica {
  return { tipo: 'cotizacion', estado: 'nuevo', creadoEn: dias(1), pagadoEn: null, precioFinal: null, precioEstimado: null, origen: null, ...p };
}

describe('estados', () => {
  it('tiene etiqueta y texto para el cliente en cada estado', () => {
    for (const e of ESTADOS) {
      expect(ETIQUETA_ESTADO[e]).toBeTruthy();
      expect(ESTADO_PARA_CLIENTE[e].texto).toBeTruthy();
    }
  });
  it('avanza por el flujo y reconoce los estados', () => {
    expect(siguienteEstado('nuevo')).toBe('cotizado');
    expect(siguienteEstado('entregado')).toBe('pagado');
    expect(siguienteEstado('pagado')).toBeNull();
    expect(siguienteEstado('cancelado')).toBeNull();
    expect(yaAprobado('en_produccion')).toBe(true);
    expect(yaAprobado('cotizado')).toBe(false);
    expect(yaAprobado('cancelado')).toBe(false);
    expect(esEstado('listo')).toBe(true);
    expect(esEstado('borrado')).toBe(false);
  });
});

describe('origen de los clientes', () => {
  it('traduce UTM y referentes a canales legibles', () => {
    expect(canalDeOrigen({ utm_source: 'IG' })).toBe('Instagram');
    expect(canalDeOrigen({ utm_source: 'feria-cajica' })).toBe('Feria-cajica');
    expect(canalDeOrigen({ gclid: 'abc' })).toBe('Google (anuncios)');
    expect(canalDeOrigen({ referente: 'https://www.google.com.co/' })).toBe('Google (búsqueda)');
    expect(canalDeOrigen({ referente: 'https://l.instagram.com/?u=x' })).toBe('Instagram');
    expect(canalDeOrigen({ referente: 'https://blog.ejemplo.co/post' })).toBe('blog.ejemplo.co');
    expect(canalDeOrigen(null)).toBe('Directo');
  });
});

describe('resumen del panel', () => {
  it('calcula el inicio de mes en hora de Colombia', () => {
    // 1 de diciembre a las 02:00 UTC todavía es 30 de noviembre en Colombia
    expect(inicioMesColombia(new Date('2026-12-01T02:00:00Z')).toISOString()).toBe('2026-11-01T05:00:00.000Z');
  });

  it('cuenta cotizaciones de los últimos 7 días y los 7 anteriores', () => {
    const r = calcularResumen(
      [fila({ creadoEn: dias(1) }), fila({ creadoEn: dias(6) }), fila({ creadoEn: dias(9) }), fila({ tipo: 'contacto', creadoEn: dias(2) })],
      AHORA,
    );
    expect(r.cotizaciones7d).toBe(2);
    expect(r.cotizaciones7dAnterior).toBe(1);
  });

  it('calcula la conversión cotización → pedido en 30 días, sin cancelados', () => {
    const r = calcularResumen(
      [
        fila({ estado: 'nuevo' }),
        fila({ estado: 'cotizado' }),
        fila({ estado: 'aprobado' }),
        fila({ estado: 'pagado' }),
        fila({ estado: 'cancelado' }),
        fila({ estado: 'aprobado', creadoEn: dias(40) }),
      ],
      AHORA,
    );
    expect(r.conversion).toEqual({ cotizaciones: 4, aprobadas: 2, tasa: 0.5 });
  });

  it('suma ingresos y ticket promedio de los pagos del mes', () => {
    const r = calcularResumen(
      [
        fila({ estado: 'pagado', pagadoEn: '2026-11-03T12:00:00Z', precioFinal: 100000 }),
        fila({ estado: 'pagado', pagadoEn: '2026-11-10T12:00:00Z', precioFinal: null, precioEstimado: 50000 }),
        fila({ estado: 'pagado', pagadoEn: '2026-10-30T12:00:00Z', precioFinal: 999999 }),
        fila({ estado: 'en_produccion' }),
      ],
      AHORA,
    );
    expect(r.ingresosMes).toBe(150000);
    expect(r.pagadosMes).toBe(2);
    expect(r.ticketPromedio).toBe(75000);
    expect(r.enProduccion).toBe(1);
    expect(r.porEstado.pagado).toBe(3);
  });

  it('agrupa el origen de los últimos 90 días, de mayor a menor', () => {
    const r = calcularResumen(
      [fila({ origen: { utm_source: 'instagram' } }), fila({ origen: { utm_source: 'ig' } }), fila({ origen: null }), fila({ origen: { utm_source: 'ig' }, creadoEn: dias(120) })],
      AHORA,
    );
    expect(r.origenes).toEqual([
      { canal: 'Instagram', cantidad: 2 },
      { canal: 'Directo', cantidad: 1 },
    ]);
  });

  it('no divide por cero sin datos', () => {
    const r = calcularResumen([], AHORA);
    expect(r.conversion.tasa).toBeNull();
    expect(r.ticketPromedio).toBeNull();
  });
});

describe('CSV', () => {
  it('usa punto y coma, BOM, comillas y decimales con coma', () => {
    const csv = aCsv(
      [
        { titulo: 'Nombre', valor: (f: { n: string; v: number }) => f.n },
        { titulo: 'Valor', valor: (f) => f.v },
      ],
      [{ n: 'Ana; "la del taller"', v: 1234.5 }],
    );
    expect(csv.startsWith('﻿Nombre;Valor\r\n')).toBe(true);
    expect(csv).toContain('"Ana; ""la del taller""";1234,5');
  });

  it('neutraliza fórmulas de hoja de cálculo', () => {
    expect(celda('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celda('+57 300')).toBe("'+57 300");
    expect(celda(-5)).toBe('-5');
  });
});

describe('validación de la configuración de precios', () => {
  it('acepta la configuración inicial', () => {
    expect(validarConfigPrecios(configPreciosInicial)).toEqual({ ok: true, errores: [] });
  });

  it('rechaza valores fuera de rango y referencias rotas', () => {
    const c = structuredClone(configPreciosInicial);
    c.margen = -1;
    c.materiales[0]!.colores = ['inexistente'];
    c.colores[0]!.hex = 'negro';
    c.rellenoPorDefecto = 0.33;
    const r = validarConfigPrecios(c);
    expect(r.ok).toBe(false);
    expect(r.errores.join(' | ')).toMatch(/margen/);
    expect(r.errores.join(' | ')).toMatch(/no existe/);
    expect(r.errores.join(' | ')).toMatch(/hexadecimal/);
    expect(r.errores.join(' | ')).toMatch(/relleno por defecto/);
  });

  it('exige al menos un material activo y identificadores únicos', () => {
    const c = structuredClone(configPreciosInicial);
    c.materiales.forEach((m) => (m.activo = false));
    c.colores.push({ ...c.colores[0]! });
    const r = validarConfigPrecios(c);
    expect(r.errores.join(' | ')).toMatch(/al menos un elemento activo en materiales/);
    expect(r.errores.join(' | ')).toMatch(/repetido/);
  });

  it('usa la configuración de respaldo si la guardada está dañada', () => {
    expect(configValidaO({ basura: true }, configPreciosInicial)).toBe(configPreciosInicial);
  });
});
