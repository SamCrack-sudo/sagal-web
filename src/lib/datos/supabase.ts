/**
 * REPOSITORIO SUPABASE
 * - Público: cliente con la clave de servicio, solo en el servidor (las
 *   solicitudes del sitio no pasan por RLS porque el público no tiene permisos).
 * - Admin: cliente con la sesión del administrador; RLS decide qué puede ver.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { configPreciosInicial } from '@/config/precios';
import { configValidaO } from '@/lib/precios/validar';
import type { ConfigPrecios } from '@/lib/precios/tipos';
import type {
  Archivo,
  CambiosCliente,
  CambiosSolicitud,
  Cliente,
  ClienteConTotales,
  DetalleSolicitud,
  Evento,
  FiltroSolicitudes,
  NuevaSolicitud,
  NuevoEvento,
  RepositorioAdmin,
  RepositorioPublico,
  Solicitud,
  SolicitudConCliente,
} from './tipos';

type Fila = Record<string, unknown>;

export const BUCKET = 'archivos';

// ── Conversión filas ↔ tipos ───────────────────────────────────────────
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const txt = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

export function aSolicitud(r: Fila): Solicitud {
  return {
    id: String(r.id),
    codigo: String(r.codigo),
    creadoEn: String(r.creado_en),
    actualizadoEn: String(r.actualizado_en),
    clienteId: String(r.cliente_id),
    tipo: r.tipo as Solicitud['tipo'],
    estado: r.estado as Solicitud['estado'],
    descripcion: txt(r.descripcion),
    datos: (r.datos as Record<string, unknown>) ?? {},
    parametros: (r.parametros as Record<string, unknown>) ?? null,
    metricas: (r.metricas as Record<string, unknown>) ?? null,
    desglose: (r.desglose as Record<string, unknown>) ?? null,
    precioEstimado: num(r.precio_estimado),
    precioFinal: num(r.precio_final),
    diasEntrega: num(r.dias_entrega),
    enlacePago: txt(r.enlace_pago),
    origen: (r.origen as Solicitud['origen']) ?? null,
    cotizadoEn: txt(r.cotizado_en),
    aprobadoEn: txt(r.aprobado_en),
    entregadoEn: txt(r.entregado_en),
    pagadoEn: txt(r.pagado_en),
  };
}

export function aCliente(r: Fila): Cliente {
  return {
    id: String(r.id),
    creadoEn: String(r.creado_en),
    nombre: String(r.nombre),
    correo: String(r.correo),
    telefono: txt(r.telefono),
    tipo: r.tipo as Cliente['tipo'],
    empresa: txt(r.empresa),
    nit: txt(r.nit),
    ciudad: txt(r.ciudad),
    facturacion: (r.facturacion as Record<string, string>) ?? {},
    notas: txt(r.notas),
    origenPrimero: (r.origen_primero as Cliente['origenPrimero']) ?? null,
  };
}

function aArchivo(r: Fila): Archivo {
  return {
    id: String(r.id),
    solicitudId: String(r.solicitud_id),
    creadoEn: String(r.creado_en),
    ruta: String(r.ruta),
    nombre: String(r.nombre),
    tamano: num(r.tamano),
    tipoMime: txt(r.tipo_mime),
    rol: r.rol as Archivo['rol'],
  };
}

function aEvento(r: Fila): Evento {
  return {
    id: Number(r.id),
    solicitudId: String(r.solicitud_id),
    creadoEn: String(r.creado_en),
    tipo: r.tipo as Evento['tipo'],
    estadoAnterior: (r.estado_anterior as Evento['estadoAnterior']) ?? null,
    estadoNuevo: (r.estado_nuevo as Evento['estadoNuevo']) ?? null,
    mensaje: txt(r.mensaje),
    visibleCliente: Boolean(r.visible_cliente),
    autor: String(r.autor),
    detalle: (r.detalle as Record<string, unknown>) ?? {},
  };
}

function filaEvento(solicitudId: string, e: NuevoEvento): Fila {
  return {
    solicitud_id: solicitudId,
    tipo: e.tipo,
    mensaje: e.mensaje ?? null,
    visible_cliente: e.visibleCliente ?? false,
    autor: e.autor,
    estado_anterior: e.estadoAnterior ?? null,
    estado_nuevo: e.estadoNuevo ?? null,
    detalle: e.detalle ?? {},
  };
}

function filaCambios(c: CambiosSolicitud): Fila {
  const f: Fila = {};
  if (c.estado !== undefined) f.estado = c.estado;
  if (c.precioFinal !== undefined) f.precio_final = c.precioFinal;
  if (c.diasEntrega !== undefined) f.dias_entrega = c.diasEntrega;
  if (c.enlacePago !== undefined) f.enlace_pago = c.enlacePago;
  return f;
}

/** Lanza un error legible si la consulta falló. */
function revisar<T>(r: { data: T; error: { message: string } | null }, contexto: string): T {
  if (r.error) throw new Error(`${contexto}: ${r.error.message}`);
  return r.data;
}

/** Limpia texto de búsqueda para usarlo dentro de un filtro "or" de PostgREST. */
export function limpiarBusqueda(q: string): string {
  return q.replace(/[,()*:"\\%_]/g, ' ').trim().slice(0, 80);
}

/** Nombre de archivo seguro para una ruta de Storage. */
export function nombreSeguro(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (limpio || 'archivo').slice(-100);
}

// ── Consultas compartidas ───────────────────────────────────────────────
async function leerPrecios(db: SupabaseClient): Promise<ConfigPrecios> {
  const r = await db.from('configuracion').select('valor').eq('clave', 'precios').maybeSingle();
  if (r.error) {
    console.error('[precios]', r.error.message);
    return configPreciosInicial;
  }
  return configValidaO(r.data?.valor, configPreciosInicial);
}

async function detalle(db: SupabaseClient, solicitud: Solicitud): Promise<DetalleSolicitud> {
  const [c, a, e] = await Promise.all([
    db.from('clientes').select('*').eq('id', solicitud.clienteId).single(),
    db.from('archivos').select('*').eq('solicitud_id', solicitud.id).order('creado_en'),
    db.from('eventos').select('*').eq('solicitud_id', solicitud.id).order('creado_en').order('id'),
  ]);
  return {
    solicitud,
    cliente: aCliente(revisar(c, 'cliente') as Fila),
    archivos: (revisar(a, 'archivos') as Fila[]).map(aArchivo),
    eventos: (revisar(e, 'eventos') as Fila[]).map(aEvento),
  };
}

// ── Repositorio público (clave de servicio) ─────────────────────────────
export function crearRepositorioPublico(cfg: { url: string; servicio: string }): RepositorioPublico {
  const db = createClient(cfg.url, cfg.servicio, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    modo: 'supabase',
    leerPrecios: () => leerPrecios(db),

    async crearSolicitud(n: NuevaSolicitud, codigo: string) {
      const c = n.contacto;
      const existente = revisar(await db.from('clientes').select('id').eq('correo', c.correo).maybeSingle(), 'buscar cliente') as Fila | null;
      const datosCliente: Fila = { nombre: c.nombre, tipo: c.tipoCliente };
      if (c.telefono) datosCliente.telefono = c.telefono;
      if (c.ciudad) datosCliente.ciudad = c.ciudad;
      if (c.empresa) datosCliente.empresa = c.empresa;
      if (c.nit) datosCliente.nit = c.nit;
      if (c.facturacion && Object.keys(c.facturacion).length) datosCliente.facturacion = c.facturacion;

      let clienteId: string;
      if (existente) {
        clienteId = String(existente.id);
        revisar(await db.from('clientes').update(datosCliente).eq('id', clienteId), 'actualizar cliente');
      } else {
        const nuevo = revisar(
          await db.from('clientes').insert({ ...datosCliente, correo: c.correo, origen_primero: n.origen }).select('id').single(),
          'crear cliente',
        ) as Fila;
        clienteId = String(nuevo.id);
      }

      const s = revisar(
        await db
          .from('solicitudes')
          .insert({
            codigo,
            cliente_id: clienteId,
            tipo: n.tipo,
            descripcion: n.descripcion ?? null,
            datos: n.datos ?? {},
            parametros: n.parametros ?? null,
            metricas: n.metricas ?? null,
            desglose: n.desglose ?? null,
            precio_estimado: n.precioEstimado ?? null,
            dias_entrega: n.diasEntrega ?? null,
            origen: n.origen,
          })
          .select('id')
          .single(),
        'crear solicitud',
      ) as Fila;
      const id = String(s.id);

      const archivosFallidos: string[] = [];
      for (const { archivo, rol } of n.archivos) {
        const ruta = `${id}/${crypto.randomUUID().slice(0, 8)}-${nombreSeguro(archivo.name)}`;
        const subida = await db.storage
          .from(BUCKET)
          .upload(ruta, archivo, { contentType: archivo.type || 'application/octet-stream', upsert: false });
        if (subida.error) {
          console.error('[storage]', archivo.name, subida.error.message);
          archivosFallidos.push(archivo.name);
          continue;
        }
        const r = await db.from('archivos').insert({ solicitud_id: id, ruta, nombre: archivo.name, tamano: archivo.size, tipo_mime: archivo.type || null, rol });
        if (r.error) archivosFallidos.push(archivo.name);
      }

      revisar(
        await db.from('eventos').insert(
          filaEvento(id, {
            tipo: 'creada',
            estadoNuevo: 'nuevo',
            mensaje: 'Solicitud recibida desde el sitio.',
            visibleCliente: true,
            autor: 'sistema',
            detalle: archivosFallidos.length ? { archivosFallidos } : {},
          }),
        ),
        'registrar evento',
      );
      return { id, archivosFallidos };
    },

    async buscarPorCodigo(codigo: string) {
      const r = revisar(await db.from('solicitudes').select('*').eq('codigo', codigo).maybeSingle(), 'buscar código') as Fila | null;
      return r ? detalle(db, aSolicitud(r)) : null;
    },

    async aprobarPorCliente(codigo: string) {
      // Actualización condicional: solo pasa si sigue en "cotizado" (evita dobles aprobaciones).
      const r = revisar(
        await db.from('solicitudes').update({ estado: 'aprobado' }).eq('codigo', codigo).eq('estado', 'cotizado').select('*').maybeSingle(),
        'aprobar',
      ) as Fila | null;
      if (!r) return null;
      const s = aSolicitud(r);
      revisar(
        await db.from('eventos').insert(
          filaEvento(s.id, {
            tipo: 'aprobacion_cliente',
            estadoAnterior: 'cotizado',
            estadoNuevo: 'aprobado',
            mensaje: 'Aprobaste la cotización.',
            visibleCliente: true,
            autor: 'cliente',
          }),
        ),
        'registrar aprobación',
      );
      return detalle(db, s);
    },

    async sincronizarAdministradores(correos: string[]) {
      if (correos.length === 0) return;
      const lista = correos.map((c) => `"${c.replace(/"/g, '')}"`).join(',');
      revisar(await db.from('administradores').delete().not('correo', 'in', `(${lista})`), 'depurar administradores');
      revisar(
        await db.from('administradores').upsert(
          correos.map((correo) => ({ correo })),
          { onConflict: 'correo', ignoreDuplicates: true },
        ),
        'registrar administradores',
      );
    },
  };
}

// ── Repositorio del panel (sesión del administrador) ────────────────────
export function crearRepositorioAdmin(db: SupabaseClient): RepositorioAdmin {
  return {
    modo: 'supabase',

    async listarSolicitudes(f: FiltroSolicitudes = {}) {
      let consulta = db
        .from('solicitudes')
        .select('*, cliente:clientes(id, nombre, correo, telefono, tipo, empresa)')
        .order('creado_en', { ascending: false })
        .limit(f.limite ?? 500);
      if (f.estado) consulta = consulta.eq('estado', f.estado);
      if (f.tipo) consulta = consulta.eq('tipo', f.tipo);
      const q = f.q ? limpiarBusqueda(f.q) : '';
      if (q) {
        const clientes = revisar(
          await db.from('clientes').select('id').or(`nombre.ilike.*${q}*,correo.ilike.*${q}*,empresa.ilike.*${q}*`).limit(200),
          'buscar clientes',
        ) as Fila[];
        const ids = clientes.map((c) => String(c.id));
        const condiciones = [`codigo.ilike.*${q}*`, `descripcion.ilike.*${q}*`];
        if (ids.length) condiciones.push(`cliente_id.in.(${ids.join(',')})`);
        consulta = consulta.or(condiciones.join(','));
      }
      const filas = revisar(await consulta, 'listar solicitudes') as Fila[];
      return filas.map<SolicitudConCliente>((r) => ({
        ...aSolicitud(r),
        cliente: aCliente({ ...(r.cliente as Fila), creado_en: '', facturacion: {} }) as SolicitudConCliente['cliente'],
      }));
    },

    async detalle(id: string) {
      const r = revisar(await db.from('solicitudes').select('*').eq('id', id).maybeSingle(), 'solicitud') as Fila | null;
      return r ? detalle(db, aSolicitud(r)) : null;
    },

    async actualizarSolicitud(id: string, cambios: CambiosSolicitud, evento: NuevoEvento) {
      const fila = filaCambios(cambios);
      if (Object.keys(fila).length) revisar(await db.from('solicitudes').update(fila).eq('id', id), 'actualizar solicitud');
      revisar(await db.from('eventos').insert(filaEvento(id, evento)), 'registrar evento');
    },

    async agregarEvento(id: string, evento: NuevoEvento) {
      revisar(await db.from('eventos').insert(filaEvento(id, evento)), 'registrar evento');
    },

    async descargarArchivo(archivoId: string) {
      const r = revisar(await db.from('archivos').select('*').eq('id', archivoId).maybeSingle(), 'archivo') as Fila | null;
      if (!r) return null;
      const a = aArchivo(r);
      const firmada = await db.storage.from(BUCKET).createSignedUrl(a.ruta, 120, { download: a.nombre });
      if (firmada.error || !firmada.data) return { nombre: a.nombre };
      return { nombre: a.nombre, url: firmada.data.signedUrl };
    },

    async listarClientes(q?: string) {
      let consulta = db
        .from('clientes')
        .select('*, solicitudes(creado_en, pagado_en, precio_final, precio_estimado)')
        .order('actualizado_en', { ascending: false })
        .limit(500);
      const t = q ? limpiarBusqueda(q) : '';
      if (t) consulta = consulta.or(`nombre.ilike.*${t}*,correo.ilike.*${t}*,empresa.ilike.*${t}*,telefono.ilike.*${t}*`);
      const filas = revisar(await consulta, 'listar clientes') as Fila[];
      return filas
        .map<ClienteConTotales>((r) => {
          const sols = (r.solicitudes as Fila[]) ?? [];
          return {
            ...aCliente(r),
            solicitudes: sols.length,
            ultimaSolicitud: sols.map((s) => String(s.creado_en)).sort().at(-1) ?? null,
            totalPagado: sols.filter((s) => s.pagado_en).reduce((t2, s) => t2 + (num(s.precio_final) ?? num(s.precio_estimado) ?? 0), 0),
          };
        })
        .sort((x, y) => (y.ultimaSolicitud ?? '').localeCompare(x.ultimaSolicitud ?? ''));
    },

    async cliente(id: string) {
      const [c, s] = await Promise.all([
        db.from('clientes').select('*').eq('id', id).maybeSingle(),
        db.from('solicitudes').select('*').eq('cliente_id', id).order('creado_en', { ascending: false }),
      ]);
      const fila = revisar(c, 'cliente') as Fila | null;
      if (!fila) return null;
      return { cliente: aCliente(fila), solicitudes: (revisar(s, 'solicitudes del cliente') as Fila[]).map(aSolicitud) };
    },

    async actualizarCliente(id: string, cambios: CambiosCliente) {
      const f: Fila = {};
      for (const [k, v] of Object.entries(cambios)) f[k] = v;
      revisar(await db.from('clientes').update(f).eq('id', id), 'actualizar cliente');
    },

    leerPrecios: () => leerPrecios(db),

    async guardarPrecios(config: ConfigPrecios, autor: string) {
      revisar(
        await db.from('configuracion').upsert({ clave: 'precios', valor: config, actualizado_por: autor }, { onConflict: 'clave' }),
        'guardar precios',
      );
    },

    async filasMetricas(desde: Date) {
      const iso = desde.toISOString();
      const filas = revisar(
        await db
          .from('solicitudes')
          .select('tipo, estado, creado_en, pagado_en, precio_final, precio_estimado, origen')
          .or(`creado_en.gte."${iso}",pagado_en.gte."${iso}"`)
          .limit(5000),
        'métricas',
      ) as Fila[];
      return filas.map((r) => ({
        tipo: String(r.tipo),
        estado: r.estado as Solicitud['estado'],
        creadoEn: String(r.creado_en),
        pagadoEn: txt(r.pagado_en),
        precioFinal: num(r.precio_final),
        precioEstimado: num(r.precio_estimado),
        origen: (r.origen as Solicitud['origen']) ?? null,
      }));
    },
  };
}
