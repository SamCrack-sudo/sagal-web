import { beforeEach, describe, expect, it } from 'vitest';
import { aCliente, aSolicitud, limpiarBusqueda, nombreSeguro } from './supabase';
import { repositorioDemo, reiniciarDemo } from './demo';
import { esCodigoValido } from '@/lib/solicitudes/codigo';
import { validarConfigPrecios } from '@/lib/precios/validar';

describe('conversión de filas de Supabase', () => {
  it('convierte snake_case a los tipos del sitio y los numéricos a número', () => {
    const s = aSolicitud({
      id: 'x', codigo: 'SR-AAAAA-BBBBB', creado_en: '2026-01-01', actualizado_en: '2026-01-02', cliente_id: 'c',
      tipo: 'cotizacion', estado: 'cotizado', descripcion: null, datos: null, parametros: { a: 1 }, metricas: null, desglose: null,
      precio_estimado: '47200.00', precio_final: null, dias_entrega: 3, enlace_pago: null, origen: { utm_source: 'ig' },
      cotizado_en: '2026-01-02', aprobado_en: null, entregado_en: null, pagado_en: null,
    });
    expect(s.precioEstimado).toBe(47200);
    expect(s.precioFinal).toBeNull();
    expect(s.datos).toEqual({});
    expect(s.origen?.utm_source).toBe('ig');
    const c = aCliente({ id: 'c', creado_en: 'x', nombre: 'Ana', correo: 'a@b.co', tipo: 'empresa', facturacion: null });
    expect(c.facturacion).toEqual({});
    expect(c.telefono).toBeNull();
  });

  it('limpia la búsqueda de caracteres que rompen los filtros de PostgREST', () => {
    expect(limpiarBusqueda('ana,(correo).ilike*"x"%_')).toBe('ana  correo .ilike  x');
  });

  it('genera nombres de archivo seguros para Storage', () => {
    expect(nombreSeguro('Pieza ñandú (v2).STL')).toBe('Pieza_nandu_v2_.STL');
    expect(nombreSeguro('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(nombreSeguro('###')).toBe('archivo');
  });
});

describe('repositorio de demostración', () => {
  beforeEach(() => reiniciarDemo());

  it('trae datos de ejemplo con códigos de formato válido y precios válidos', async () => {
    const lista = await repositorioDemo.listarSolicitudes();
    expect(lista.length).toBeGreaterThan(5);
    for (const s of lista) expect(esCodigoValido(s.codigo, 'SR'), s.codigo).toBe(true);
    expect(validarConfigPrecios(await repositorioDemo.leerPrecios()).ok).toBe(true);
  });

  it('crea una solicitud, reutiliza el cliente por correo y la encuentra por código', async () => {
    const base = {
      tipo: 'contacto' as const,
      contacto: { nombre: 'Prueba', correo: 'prueba@ejemplo.co', tipoCliente: 'persona' as const },
      origen: null,
      archivos: [{ archivo: new File(['hola'], 'nota.txt', { type: 'text/plain' }), rol: 'adjunto' as const }],
    };
    const a = await repositorioDemo.crearSolicitud(base, 'SR-PRB22-AAAAA');
    await repositorioDemo.crearSolicitud({ ...base, contacto: { ...base.contacto, nombre: 'Prueba 2' } }, 'SR-PRB33-BBBBB');
    const clientes = await repositorioDemo.listarClientes('prueba@ejemplo.co');
    expect(clientes).toHaveLength(1);
    expect(clientes[0]!.solicitudes).toBe(2);
    expect(clientes[0]!.nombre).toBe('Prueba 2');
    const d = await repositorioDemo.buscarPorCodigo('SR-PRB22-AAAAA');
    expect(d?.solicitud.id).toBe(a.id);
    expect(d?.eventos[0]?.tipo).toBe('creada');
    const archivo = await repositorioDemo.descargarArchivo(d!.archivos[0]!.id);
    expect(await archivo?.contenido?.text()).toBe('hola');
  });

  it('solo permite aprobar una cotización en estado cotizado, una vez', async () => {
    const [cotizada] = await repositorioDemo.listarSolicitudes({ estado: 'cotizado' });
    expect(cotizada).toBeDefined();
    const r = await repositorioDemo.aprobarPorCliente(cotizada!.codigo);
    expect(r?.solicitud.estado).toBe('aprobado');
    expect(r?.solicitud.aprobadoEn).not.toBeNull();
    expect(await repositorioDemo.aprobarPorCliente(cotizada!.codigo)).toBeNull();
  });

  it('registra cambios de estado con su evento y marca el hito de pago', async () => {
    const [s] = await repositorioDemo.listarSolicitudes({ estado: 'entregado' });
    await repositorioDemo.actualizarSolicitud(s!.id, { estado: 'pagado' }, { tipo: 'estado', estadoAnterior: 'entregado', estadoNuevo: 'pagado', autor: 'yo', visibleCliente: true });
    const d = await repositorioDemo.detalle(s!.id);
    expect(d?.solicitud.pagadoEn).not.toBeNull();
    expect(d?.eventos.at(-1)?.estadoNuevo).toBe('pagado');
  });
});
