/**
 * REPOSITORIO DE DEMOSTRACIÓN (en memoria)
 * Se usa cuando no hay Supabase configurado, para que el panel y el
 * seguimiento se puedan probar en la vista previa. Los datos de ejemplo están
 * marcados "(demo)" y TODO se borra al reiniciar el servidor.
 */
import { configPreciosInicial } from '@/config/precios';
import type { ConfigPrecios } from '@/lib/precios/tipos';
import type { Estado } from '@/lib/gestion/estados';
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
} from './tipos';

interface Almacen {
  clientes: Cliente[];
  solicitudes: Solicitud[];
  archivos: Archivo[];
  eventos: Evento[];
  contenidos: Map<string, Blob>;
  precios: ConfigPrecios;
  administradores: string[];
  siguienteEvento: number;
}

const HITOS: Partial<Record<Estado, keyof Solicitud>> = {
  cotizado: 'cotizadoEn',
  aprobado: 'aprobadoEn',
  entregado: 'entregadoEn',
  pagado: 'pagadoEn',
};

function hace(dias: number, horas = 0): string {
  return new Date(Date.now() - dias * 86_400_000 - horas * 3_600_000).toISOString();
}

function sembrar(): Almacen {
  const a: Almacen = {
    clientes: [],
    solicitudes: [],
    archivos: [],
    eventos: [],
    contenidos: new Map(),
    precios: structuredClone(configPreciosInicial),
    administradores: [],
    siguienteEvento: 1,
  };

  const clientes: [string, string, Cliente['tipo'], string | null, Cliente['origenPrimero']][] = [
    ['Ana (demo)', 'ana.demo@ejemplo.com', 'persona', null, { utm_source: 'instagram', llegada: '/' }],
    ['Jefe de mantenimiento (demo)', 'mtto.demo@ejemplo.com', 'empresa', 'Planta de ejemplo S.A.S.', { referente: 'https://www.google.com/' }],
    ['Coordinación académica (demo)', 'colegio.demo@ejemplo.com', 'colegio', 'Colegio de ejemplo', null],
    ['Carlos (demo)', 'carlos.demo@ejemplo.com', 'persona', null, { utm_source: 'whatsapp' }],
    ['Laura (demo)', 'laura.demo@ejemplo.com', 'persona', null, { referente: 'https://www.google.com.co/' }],
  ];
  clientes.forEach(([nombre, correo, tipo, empresa, origen], i) => {
    a.clientes.push({
      id: `demo-cliente-${i + 1}`,
      creadoEn: hace(40 - i * 5),
      nombre,
      correo,
      telefono: i % 2 === 0 ? null : '[TELÉFONO DE EJEMPLO]',
      tipo,
      empresa,
      nit: tipo === 'empresa' ? '[NIT DE EJEMPLO]' : null,
      ciudad: null,
      facturacion: {},
      notas: null,
      origenPrimero: origen,
    });
  });

  // [cliente, tipo, estado, días atrás, precio estimado, precio final, descripción]
  const filas: [number, Solicitud['tipo'], Estado, number, number | null, number | null, string][] = [
    [1, 'cotizacion', 'nuevo', 0.2, 47200, null, 'Soporte para cámara (archivo de ejemplo)'],
    [2, 'empresa', 'nuevo', 1, null, null, 'Engranaje descontinuado de una envasadora (solicitud de ejemplo)'],
    [4, 'cotizacion', 'cotizado', 3, 31500, 35000, 'Carcasa para circuito (archivo de ejemplo)'],
    [5, 'diseno_cad', 'aprobado', 6, null, 80000, 'Diseño de pieza de repuesto (solicitud de ejemplo)'],
    [1, 'cotizacion', 'en_produccion', 8, 64300, 64300, 'Maqueta multicolor (archivo de ejemplo)'],
    [2, 'empresa', 'listo', 12, null, 240000, 'Guardas para sensores (solicitud de ejemplo)'],
    [3, 'contacto', 'entregado', 18, null, 150000, 'Kits para taller de robótica (solicitud de ejemplo)'],
    [4, 'cotizacion', 'pagado', 9, 25000, 25000, 'Organizador de escritorio (archivo de ejemplo)'],
    [5, 'cotizacion', 'cancelado', 15, 42000, null, 'Figura decorativa (archivo de ejemplo)'],
  ];
  // Códigos válidos (mismo formato que los reales) y fáciles de reconocer: "SR-DEM…".
  const CODIGOS_DEMO = ['SR-DEMA2-K7P3Q', 'SR-DEMB3-M8R4S', 'SR-DEMC4-N9T5U', 'SR-DEMD5-P2V6W', 'SR-DEME6-Q3X7Y', 'SR-DEMF7-R4Y8Z', 'SR-DEMG8-S5Z9A', 'SR-DEMH9-T6A2B', 'SR-DEMJ2-U7B3C'];
  const orden: Estado[] = ['nuevo', 'cotizado', 'aprobado', 'en_produccion', 'listo', 'entregado', 'pagado'];

  filas.forEach(([c, tipo, estado, dias, estimado, final, descripcion], i) => {
    const id = `demo-solicitud-${i + 1}`;
    const codigo = CODIGOS_DEMO[i]!;
    const s: Solicitud = {
      id,
      codigo,
      creadoEn: hace(dias),
      actualizadoEn: hace(Math.max(0, dias - 1)),
      clienteId: `demo-cliente-${c}`,
      tipo,
      estado,
      descripcion,
      datos: { demo: true },
      parametros: tipo === 'cotizacion' ? { materialId: 'pla', colores: ['negro'], calidadId: 'estandar', relleno: 0.15, cantidad: 1, posprocesadoId: 'ninguno', urgenciaId: 'normal' } : null,
      metricas: tipo === 'cotizacion' ? { volumenMm3: 42000, areaMm2: 9800, tamano: [80, 60, 25] } : null,
      desglose: null,
      precioEstimado: estimado,
      precioFinal: final,
      diasEntrega: final ? 3 : null,
      enlacePago: null,
      origen: a.clientes[c - 1]!.origenPrimero,
      cotizadoEn: null,
      aprobadoEn: null,
      entregadoEn: null,
      pagadoEn: null,
    };
    a.solicitudes.push(s);
    a.eventos.push({ id: a.siguienteEvento++, solicitudId: id, creadoEn: s.creadoEn, tipo: 'creada', estadoAnterior: null, estadoNuevo: 'nuevo', mensaje: 'Solicitud recibida desde el sitio.', visibleCliente: true, autor: 'sistema', detalle: {} });

    const hasta = estado === 'cancelado' ? 0 : orden.indexOf(estado);
    for (let k = 1; k <= hasta; k++) {
      const e = orden[k]!;
      const fecha = hace(dias * (1 - k / (hasta + 1)));
      const hito = HITOS[e];
      if (hito) (s as unknown as Record<string, unknown>)[hito] = fecha;
      a.eventos.push({ id: a.siguienteEvento++, solicitudId: id, creadoEn: fecha, tipo: 'estado', estadoAnterior: orden[k - 1]!, estadoNuevo: e, mensaje: null, visibleCliente: true, autor: 'demo@sagal', detalle: {} });
    }
    if (estado === 'cancelado') {
      a.eventos.push({ id: a.siguienteEvento++, solicitudId: id, creadoEn: hace(dias - 1), tipo: 'estado', estadoAnterior: 'nuevo', estadoNuevo: 'cancelado', mensaje: null, visibleCliente: true, autor: 'demo@sagal', detalle: {} });
    }
    if (tipo === 'cotizacion') {
      a.archivos.push({ id: `demo-archivo-${i + 1}`, solicitudId: id, creadoEn: s.creadoEn, ruta: `${id}/pieza-ejemplo.stl`, nombre: 'pieza-ejemplo.stl', tamano: 184_000, tipoMime: 'model/stl', rol: 'modelo' });
    }
  });
  a.eventos.push({ id: a.siguienteEvento++, solicitudId: 'demo-solicitud-3', creadoEn: hace(2), tipo: 'nota', estadoAnterior: null, estadoNuevo: null, mensaje: 'Nota interna de ejemplo: confirmar si la tapa va atornillada.', visibleCliente: false, autor: 'demo@sagal', detalle: {} });
  return a;
}

// Un solo almacén por proceso (sobrevive a la recarga en caliente en desarrollo).
const global = globalThis as unknown as { __almacenDemoSagal?: Almacen };
function almacen(): Almacen {
  global.__almacenDemoSagal ??= sembrar();
  return global.__almacenDemoSagal;
}

/** Solo para pruebas: reinicia el almacén con los datos de ejemplo. */
export function reiniciarDemo() {
  global.__almacenDemoSagal = sembrar();
}

const copia = <T>(v: T): T => structuredClone(v);

function detalleDe(a: Almacen, s: Solicitud): DetalleSolicitud {
  return {
    solicitud: copia(s),
    cliente: copia(a.clientes.find((c) => c.id === s.clienteId)!),
    archivos: copia(a.archivos.filter((x) => x.solicitudId === s.id)),
    eventos: copia(a.eventos.filter((e) => e.solicitudId === s.id).sort((x, y) => x.creadoEn.localeCompare(y.creadoEn) || x.id - y.id)),
  };
}

function registrarEvento(a: Almacen, solicitudId: string, e: NuevoEvento) {
  a.eventos.push({
    id: a.siguienteEvento++,
    solicitudId,
    creadoEn: new Date().toISOString(),
    tipo: e.tipo,
    estadoAnterior: e.estadoAnterior ?? null,
    estadoNuevo: e.estadoNuevo ?? null,
    mensaje: e.mensaje ?? null,
    visibleCliente: e.visibleCliente ?? false,
    autor: e.autor,
    detalle: e.detalle ?? {},
  });
}

function aplicarCambios(s: Solicitud, cambios: CambiosSolicitud) {
  const ahora = new Date().toISOString();
  if (cambios.estado && cambios.estado !== s.estado) {
    s.estado = cambios.estado;
    const hito = HITOS[cambios.estado];
    if (hito && !s[hito]) (s as unknown as Record<string, unknown>)[hito] = ahora;
  }
  if (cambios.precioFinal !== undefined) s.precioFinal = cambios.precioFinal;
  if (cambios.diasEntrega !== undefined) s.diasEntrega = cambios.diasEntrega;
  if (cambios.enlacePago !== undefined) s.enlacePago = cambios.enlacePago;
  s.actualizadoEn = ahora;
}

export const repositorioDemo: RepositorioPublico & RepositorioAdmin = {
  modo: 'demo',

  async leerPrecios() {
    return copia(almacen().precios);
  },

  async crearSolicitud(n: NuevaSolicitud, codigo: string) {
    const a = almacen();
    const ahora = new Date().toISOString();
    let cliente = a.clientes.find((c) => c.correo === n.contacto.correo);
    if (!cliente) {
      cliente = {
        id: crypto.randomUUID(),
        creadoEn: ahora,
        nombre: n.contacto.nombre,
        correo: n.contacto.correo,
        telefono: n.contacto.telefono ?? null,
        tipo: n.contacto.tipoCliente,
        empresa: n.contacto.empresa ?? null,
        nit: n.contacto.nit ?? null,
        ciudad: n.contacto.ciudad ?? null,
        facturacion: n.contacto.facturacion ?? {},
        notas: null,
        origenPrimero: n.origen,
      };
      a.clientes.push(cliente);
    } else {
      cliente.nombre = n.contacto.nombre;
      cliente.tipo = n.contacto.tipoCliente;
      cliente.telefono = n.contacto.telefono ?? cliente.telefono;
      cliente.ciudad = n.contacto.ciudad ?? cliente.ciudad;
      cliente.empresa = n.contacto.empresa ?? cliente.empresa;
      cliente.nit = n.contacto.nit ?? cliente.nit;
      if (n.contacto.facturacion && Object.keys(n.contacto.facturacion).length) cliente.facturacion = n.contacto.facturacion;
    }
    const id = crypto.randomUUID();
    a.solicitudes.push({
      id,
      codigo,
      creadoEn: ahora,
      actualizadoEn: ahora,
      clienteId: cliente.id,
      tipo: n.tipo,
      estado: 'nuevo',
      descripcion: n.descripcion ?? null,
      datos: n.datos ?? {},
      parametros: n.parametros ?? null,
      metricas: n.metricas ?? null,
      desglose: n.desglose ?? null,
      precioEstimado: n.precioEstimado ?? null,
      precioFinal: null,
      diasEntrega: n.diasEntrega ?? null,
      enlacePago: null,
      origen: n.origen,
      cotizadoEn: null,
      aprobadoEn: null,
      entregadoEn: null,
      pagadoEn: null,
    });
    for (const { archivo, rol } of n.archivos) {
      const archivoId = crypto.randomUUID();
      a.archivos.push({ id: archivoId, solicitudId: id, creadoEn: ahora, ruta: `${id}/${archivo.name}`, nombre: archivo.name, tamano: archivo.size, tipoMime: archivo.type || null, rol });
      a.contenidos.set(archivoId, archivo);
    }
    registrarEvento(a, id, { tipo: 'creada', estadoNuevo: 'nuevo', mensaje: 'Solicitud recibida desde el sitio.', visibleCliente: true, autor: 'sistema' });
    return { id, archivosFallidos: [] };
  },

  async buscarPorCodigo(codigo: string) {
    const a = almacen();
    const s = a.solicitudes.find((x) => x.codigo === codigo);
    return s ? detalleDe(a, s) : null;
  },

  async aprobarPorCliente(codigo: string) {
    const a = almacen();
    const s = a.solicitudes.find((x) => x.codigo === codigo);
    if (!s || s.estado !== 'cotizado') return null;
    aplicarCambios(s, { estado: 'aprobado' });
    registrarEvento(a, s.id, { tipo: 'aprobacion_cliente', estadoAnterior: 'cotizado', estadoNuevo: 'aprobado', mensaje: 'Aprobaste la cotización.', visibleCliente: true, autor: 'cliente' });
    return detalleDe(a, s);
  },

  async sincronizarAdministradores(correos: string[]) {
    almacen().administradores = [...correos];
  },

  async listarSolicitudes(filtro: FiltroSolicitudes = {}) {
    const a = almacen();
    const q = filtro.q?.trim().toLowerCase();
    return a.solicitudes
      .filter((s) => !filtro.estado || s.estado === filtro.estado)
      .filter((s) => !filtro.tipo || s.tipo === filtro.tipo)
      .map((s) => {
        const c = a.clientes.find((x) => x.id === s.clienteId)!;
        return { ...copia(s), cliente: { id: c.id, nombre: c.nombre, correo: c.correo, telefono: c.telefono, tipo: c.tipo, empresa: c.empresa } };
      })
      .filter((s) => !q || [s.codigo, s.cliente.nombre, s.cliente.correo, s.cliente.empresa ?? '', s.descripcion ?? ''].some((v) => v.toLowerCase().includes(q)))
      .sort((x, y) => y.creadoEn.localeCompare(x.creadoEn))
      .slice(0, filtro.limite ?? 500);
  },

  async detalle(id: string) {
    const a = almacen();
    const s = a.solicitudes.find((x) => x.id === id);
    return s ? detalleDe(a, s) : null;
  },

  async actualizarSolicitud(id: string, cambios: CambiosSolicitud, evento: NuevoEvento) {
    const a = almacen();
    const s = a.solicitudes.find((x) => x.id === id);
    if (!s) throw new Error('Solicitud no encontrada');
    aplicarCambios(s, cambios);
    registrarEvento(a, id, evento);
  },

  async agregarEvento(id: string, evento: NuevoEvento) {
    registrarEvento(almacen(), id, evento);
  },

  async descargarArchivo(archivoId: string) {
    const a = almacen();
    const x = a.archivos.find((f) => f.id === archivoId);
    if (!x) return null;
    const contenido = a.contenidos.get(archivoId);
    return { nombre: x.nombre, contenido };
  },

  async listarClientes(q?: string) {
    const a = almacen();
    const t = q?.trim().toLowerCase();
    return a.clientes
      .filter((c) => !t || [c.nombre, c.correo, c.empresa ?? '', c.telefono ?? ''].some((v) => v.toLowerCase().includes(t)))
      .map<ClienteConTotales>((c) => {
        const propias = a.solicitudes.filter((s) => s.clienteId === c.id);
        return {
          ...copia(c),
          solicitudes: propias.length,
          ultimaSolicitud: propias.map((s) => s.creadoEn).sort().at(-1) ?? null,
          totalPagado: propias.filter((s) => s.pagadoEn).reduce((t2, s) => t2 + (s.precioFinal ?? s.precioEstimado ?? 0), 0),
        };
      })
      .sort((x, y) => (y.ultimaSolicitud ?? '').localeCompare(x.ultimaSolicitud ?? ''));
  },

  async cliente(id: string) {
    const a = almacen();
    const c = a.clientes.find((x) => x.id === id);
    if (!c) return null;
    return {
      cliente: copia(c),
      solicitudes: copia(a.solicitudes.filter((s) => s.clienteId === id).sort((x, y) => y.creadoEn.localeCompare(x.creadoEn))),
    };
  },

  async actualizarCliente(id: string, cambios: CambiosCliente) {
    const c = almacen().clientes.find((x) => x.id === id);
    if (!c) throw new Error('Cliente no encontrado');
    Object.assign(c, cambios);
  },

  async guardarPrecios(config: ConfigPrecios) {
    almacen().precios = copia(config);
  },

  async filasMetricas(desde: Date) {
    const a = almacen();
    const limite = desde.toISOString();
    return a.solicitudes
      .filter((s) => s.creadoEn >= limite || (s.pagadoEn ?? '') >= limite)
      .map((s) => ({
        tipo: s.tipo,
        estado: s.estado,
        creadoEn: s.creadoEn,
        pagadoEn: s.pagadoEn,
        precioFinal: s.precioFinal,
        precioEstimado: s.precioEstimado,
        origen: s.origen,
      }));
  },
};
