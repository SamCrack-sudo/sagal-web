/**
 * Tipos de datos de la gestión (fase 2) y contrato del repositorio.
 * Hay dos implementaciones: Supabase (real) y Demo (en memoria, para la vista
 * previa sin cuentas configuradas). El resto del sitio solo usa este contrato.
 */
import type { Estado } from '@/lib/gestion/estados';
import type { FilaMetrica } from '@/lib/gestion/metricas';
import type { ConfigPrecios } from '@/lib/precios/tipos';
import type { OrigenVisita, TipoCliente, TipoSolicitud } from '@/lib/solicitudes/tipos';

export interface Cliente {
  id: string;
  creadoEn: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipo: TipoCliente;
  empresa: string | null;
  nit: string | null;
  ciudad: string | null;
  facturacion: Record<string, string>;
  notas: string | null;
  origenPrimero: OrigenVisita | null;
}

export interface Solicitud {
  id: string;
  codigo: string;
  creadoEn: string;
  actualizadoEn: string;
  clienteId: string;
  tipo: TipoSolicitud;
  estado: Estado;
  descripcion: string | null;
  datos: Record<string, unknown>;
  parametros: Record<string, unknown> | null;
  metricas: Record<string, unknown> | null;
  desglose: Record<string, unknown> | null;
  precioEstimado: number | null;
  precioFinal: number | null;
  diasEntrega: number | null;
  enlacePago: string | null;
  origen: OrigenVisita | null;
  cotizadoEn: string | null;
  aprobadoEn: string | null;
  entregadoEn: string | null;
  pagadoEn: string | null;
}

export type RolArchivo = 'modelo' | 'adjunto' | 'foto';

export interface Archivo {
  id: string;
  solicitudId: string;
  creadoEn: string;
  ruta: string;
  nombre: string;
  tamano: number | null;
  tipoMime: string | null;
  rol: RolArchivo;
}

export type TipoEvento = 'creada' | 'estado' | 'precio' | 'nota' | 'notificacion' | 'aprobacion_cliente';

export interface Evento {
  id: number;
  solicitudId: string;
  creadoEn: string;
  tipo: TipoEvento;
  estadoAnterior: Estado | null;
  estadoNuevo: Estado | null;
  mensaje: string | null;
  visibleCliente: boolean;
  autor: string;
  detalle: Record<string, unknown>;
}

export type ResumenCliente = Pick<Cliente, 'id' | 'nombre' | 'correo' | 'telefono' | 'tipo' | 'empresa'>;

export interface SolicitudConCliente extends Solicitud {
  cliente: ResumenCliente;
}

export interface DetalleSolicitud {
  solicitud: Solicitud;
  cliente: Cliente;
  archivos: Archivo[];
  eventos: Evento[];
}

export interface ClienteConTotales extends Cliente {
  solicitudes: number;
  ultimaSolicitud: string | null;
  /** Suma de lo pagado (precio final, o estimado si no hay final). */
  totalPagado: number;
}

export interface NuevaSolicitud {
  tipo: TipoSolicitud;
  contacto: {
    nombre: string;
    correo: string;
    telefono?: string;
    tipoCliente: TipoCliente;
    ciudad?: string;
    empresa?: string;
    nit?: string;
    facturacion?: Record<string, string>;
  };
  descripcion?: string;
  datos?: Record<string, unknown>;
  parametros?: Record<string, unknown>;
  metricas?: Record<string, unknown>;
  desglose?: Record<string, unknown>;
  precioEstimado?: number;
  diasEntrega?: number;
  origen: OrigenVisita | null;
  archivos: { archivo: File; rol: RolArchivo }[];
}

export interface NuevoEvento {
  tipo: TipoEvento;
  mensaje?: string | null;
  visibleCliente?: boolean;
  autor: string;
  estadoAnterior?: Estado | null;
  estadoNuevo?: Estado | null;
  detalle?: Record<string, unknown>;
}

export interface CambiosSolicitud {
  estado?: Estado;
  precioFinal?: number | null;
  diasEntrega?: number | null;
  enlacePago?: string | null;
}

export interface FiltroSolicitudes {
  estado?: Estado;
  tipo?: TipoSolicitud;
  /** Busca en código, nombre, correo y empresa. */
  q?: string;
  limite?: number;
}

export type CambiosCliente = Partial<Pick<Cliente, 'nombre' | 'telefono' | 'tipo' | 'empresa' | 'nit' | 'ciudad' | 'notas' | 'facturacion'>>;

/** Operaciones del sitio público. Corren en el servidor con permisos de servicio. */
export interface RepositorioPublico {
  modo: 'supabase' | 'demo';
  leerPrecios(): Promise<ConfigPrecios>;
  crearSolicitud(nueva: NuevaSolicitud, codigo: string): Promise<{ id: string; archivosFallidos: string[] }>;
  buscarPorCodigo(codigo: string): Promise<DetalleSolicitud | null>;
  /** Registra la aprobación de una cotización hecha por el cliente desde /pedido/[codigo]. */
  aprobarPorCliente(codigo: string): Promise<DetalleSolicitud | null>;
  /** Deja en la tabla de administradores exactamente estos correos. */
  sincronizarAdministradores(correos: string[]): Promise<void>;
}

/** Operaciones del panel. Corren con la sesión del administrador (RLS). */
export interface RepositorioAdmin {
  modo: 'supabase' | 'demo';
  listarSolicitudes(filtro?: FiltroSolicitudes): Promise<SolicitudConCliente[]>;
  detalle(id: string): Promise<DetalleSolicitud | null>;
  actualizarSolicitud(id: string, cambios: CambiosSolicitud, evento: NuevoEvento): Promise<void>;
  agregarEvento(id: string, evento: NuevoEvento): Promise<void>;
  /** Descarga de un archivo: URL temporal firmada (Supabase) o el contenido (demo). */
  descargarArchivo(archivoId: string): Promise<{ nombre: string; url?: string; contenido?: Blob } | null>;
  listarClientes(q?: string): Promise<ClienteConTotales[]>;
  cliente(id: string): Promise<{ cliente: Cliente; solicitudes: Solicitud[] } | null>;
  actualizarCliente(id: string, cambios: CambiosCliente): Promise<void>;
  leerPrecios(): Promise<ConfigPrecios>;
  guardarPrecios(config: ConfigPrecios, autor: string): Promise<void>;
  filasMetricas(desde: Date): Promise<FilaMetrica[]>;
}
