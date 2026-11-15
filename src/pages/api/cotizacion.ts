/**
 * POST /api/cotizacion
 * Recibe una cotización con archivo (STL/3MF) o una solicitud de diseño CAD.
 * El precio se RECALCULA aquí a partir del archivo: el valor que muestra el
 * navegador es solo orientativo y no se confía en él.
 */
import type { APIRoute } from 'astro';
import { marca } from '@/config/marca';
import { configPreciosInicial } from '@/config/precios';
import { funciones } from '@/config/funciones';
import {
  calcularMetricas,
  ErrorMalla,
  escalarMetricas,
  leerModelo,
  UNIDADES_ARCHIVO,
  verificarVolumen,
  volumenSospechoso,
  type UnidadArchivo,
} from '@/lib/malla';
import { cotizar, ErrorCotizacion, formatoCOP, formatoNumero, type EntradaCotizacion } from '@/lib/precios/motor';
import { REGLAS_FOTOS, texto, validarArchivos, type Errores } from '@/lib/solicitudes/validacion';
import { json, leerFormulario, notificar, prepararContexto } from '@/lib/servidor/formularios';
import type { Filas } from '@/lib/servidor/plantillas';

export const prerender = false;

export const POST: APIRoute = async ({ request, site }) => {
  const form = await leerFormulario(request);
  if (form instanceof Response) return form;
  const modalidad = form.campos.modalidad === 'diseno' ? 'diseno' : 'archivo';

  // ── Solicitud de diseño CAD (sin archivo) ─────────────────────────────
  if (modalidad === 'diseno') {
    const errores: Errores = {};
    const descripcion = texto(form.campos.descripcion, 4000);
    const medidas = texto(form.campos.medidas, 600);
    const uso = texto(form.campos.uso, 300);
    const cantidad = texto(form.campos.cantidad, 20);
    const fotos = form.archivos.fotos ?? [];
    if (descripcion.length < 15) errores.descripcion = 'Cuéntanos con algo más de detalle qué necesitas (mínimo 15 caracteres).';
    const errorFotos = validarArchivos(fotos, REGLAS_FOTOS);
    if (errorFotos) errores.fotos = errorFotos;

    const ctx = await prepararContexto(form, request, errores);
    if (ctx instanceof Response) return ctx;

    const filas: Filas = [
      ['Tipo', 'Solicitud de diseño CAD'],
      ['Descripción', descripcion],
      ['Medidas', medidas || 'No indicadas'],
      ['Uso de la pieza', uso || 'No indicado'],
      ['Cantidad', cantidad || 'No indicada'],
      ['Fotos', fotos.length ? fotos.map((f) => f.name).join(', ') : 'Sin fotos'],
    ];
    const r = await notificar(ctx, {
      tipo: 'Solicitud de diseño CAD',
      esCotizacion: false,
      filasCliente: filas,
      filasDueno: [['Código', ctx.codigo], ...filas],
      archivos: fotos,
    });
    return json(r, r.ok ? 200 : 502);
  }

  // ── Cotización con archivo ────────────────────────────────────────────
  const modelo = form.archivos.modelo?.[0];
  if (!modelo) return json({ ok: false, mensaje: 'Sube un archivo STL o 3MF.', errores: { modelo: 'Falta el archivo.' } }, 422);

  const unidad = (form.campos.unidad ?? 'mm') as UnidadArchivo;
  const factorUnidad = UNIDADES_ARCHIVO[unidad]?.factor ?? 1;

  let metricas;
  try {
    // Los 3MF declaran sus unidades; la elección del cliente solo aplica a STL.
    const esStl = !modelo.name.toLowerCase().endsWith('.3mf');
    const crudas = calcularMetricas(leerModelo(modelo.name, await modelo.arrayBuffer()));
    metricas = esStl ? escalarMetricas(crudas, factorUnidad) : crudas;
  } catch (e) {
    const mensaje = e instanceof ErrorMalla ? e.message : 'No pudimos leer el archivo.';
    return json({ ok: false, mensaje, errores: { modelo: mensaje } }, 422);
  }

  let parametros: Partial<EntradaCotizacion>;
  try {
    parametros = JSON.parse(form.campos.parametros ?? '{}') as Partial<EntradaCotizacion>;
  } catch {
    return json({ ok: false, mensaje: 'Parámetros de cotización inválidos.' }, 400);
  }

  const config = configPreciosInicial; // Fase 2: se leerá de Supabase.
  const entrada: EntradaCotizacion = {
    volumenMm3: metricas.volumenMm3,
    areaMm2: metricas.areaMm2,
    materialId: String(parametros.materialId ?? ''),
    colores: Array.isArray(parametros.colores) ? parametros.colores.map(String).slice(0, 8) : [],
    calidadId: String(parametros.calidadId ?? ''),
    relleno: Number(parametros.relleno),
    cantidad: Number(parametros.cantidad),
    posprocesadoId: String(parametros.posprocesadoId ?? ''),
    urgenciaId: String(parametros.urgenciaId ?? ''),
  };

  let resultado;
  try {
    resultado = cotizar(entrada, config);
  } catch (e) {
    if (e instanceof ErrorCotizacion) return json({ ok: false, mensaje: e.message, errores: { [e.campo]: e.message } }, 422);
    throw e;
  }

  const ctx = await prepararContexto(form, request);
  if (ctx instanceof Response) return ctx;

  const material = config.materiales.find((m) => m.id === entrada.materialId)!;
  const colores = entrada.colores.map((id) => config.colores.find((c) => c.id === id)?.nombre ?? id).join(', ');
  const calidad = config.calidades.find((q) => q.id === entrada.calidadId)!;
  const post = config.posprocesados.find((p) => p.id === entrada.posprocesadoId)!;
  const urgencia = config.urgencias.find((u) => u.id === entrada.urgenciaId)!;
  const encaje = verificarVolumen(metricas.caja.tamano, marca.equipos.volumenImpresion);
  const [x, y, z] = metricas.caja.tamano.map((n) => formatoNumero(n, 1));
  const notas = texto(form.campos.notas, 2000);

  const filasCliente: Filas = [
    ['Archivo', modelo.name],
    ['Medidas (X × Y × Z)', `${x} × ${y} × ${z} mm`],
    ['Volumen', `${formatoNumero(metricas.volumenMm3 / 1000, 1)} cm³`],
    ['Material', material.nombre],
    ['Color', colores],
    ['Calidad', `${calidad.nombre} (${formatoNumero(calidad.alturaCapaMm, 2)} mm)`],
    ['Relleno', `${Math.round(entrada.relleno * 100)} %`],
    ['Cantidad', String(entrada.cantidad)],
    ['Posprocesado', post.nombre],
    ['Urgencia', urgencia.nombre],
    [config.iva.cobrar ? 'Total estimado (IVA incluido)' : 'Total estimado', formatoCOP(resultado.pedido.total)],
    ['Entrega estimada', `${resultado.entrega.diasHabiles} días hábiles`],
  ];
  if (notas) filasCliente.push(['Notas', notas]);

  const alertas: string[] = [];
  if (!encaje.cabe) {
    alertas.push(
      encaje.cabeRotada
        ? 'No cabe en la orientación actual; cabe rotándola.'
        : 'NO cabe en el volumen de impresión: requiere dividirla o escalarla.',
    );
  }
  if (volumenSospechoso(metricas)) alertas.push('Volumen sospechoso: la malla podría estar abierta.');
  if (metricas.orientacionInvertida) alertas.push('Normales invertidas en el archivo.');

  const filasDueno: Filas = [
    ['Código', ctx.codigo],
    ...filasCliente,
    ['Gramos estimados', `${formatoNumero(resultado.pedido.gramos, 0)} g`],
    ['Horas de máquina', `${formatoNumero(resultado.pedido.horas, 1)} h`],
    ['Costo de producción', formatoCOP(resultado.pedido.costo)],
    ['Precio base (con margen)', formatoCOP(resultado.pedido.base)],
    ['Descuento por cantidad', `${Math.round(resultado.pedido.descuento * 100)} %`],
    ['Recargo por urgencia', `${Math.round(resultado.pedido.recargoUrgencia * 100)} %`],
    ['Triángulos', formatoNumero(metricas.triangulos)],
    ['Alertas', alertas.length ? alertas.join(' ') : 'Ninguna'],
  ];

  const enlaceSeguimiento = funciones.seguimientoPedidos ? new URL(`/pedido/${ctx.codigo}`, site).toString() : undefined;
  const r = await notificar(ctx, {
    tipo: 'Cotización de impresión 3D',
    esCotizacion: true,
    filasCliente,
    filasDueno,
    archivos: [modelo],
    preciosDemo: config.esDemo,
    enlaceSeguimiento,
  });
  return json({ ...r, total: resultado.pedido.total }, r.ok ? 200 : 502);
};

export const ALL: APIRoute = () => json({ ok: false, mensaje: 'Método no permitido.' }, 405);
