/**
 * GET /api/admin/exportar/solicitudes.csv | clientes.csv
 * CSV para Excel (punto y coma, UTF-8 con BOM). Solo administradores.
 */
import type { APIRoute } from 'astro';
import { aCsv, type Columna } from '@/lib/gestion/csv';
import { ETIQUETA_ESTADO } from '@/lib/gestion/estados';
import { canalDeOrigen } from '@/lib/gestion/metricas';
import { TIPOS_CLIENTE, TIPOS_SOLICITUD } from '@/lib/solicitudes/tipos';
import type { ClienteConTotales, SolicitudConCliente } from '@/lib/datos/tipos';

export const prerender = false;

const fecha = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

const columnasSolicitudes: Columna<SolicitudConCliente>[] = [
  { titulo: 'Código', valor: (s) => s.codigo },
  { titulo: 'Fecha', valor: (s) => fecha(s.creadoEn) },
  { titulo: 'Tipo', valor: (s) => TIPOS_SOLICITUD[s.tipo] },
  { titulo: 'Estado', valor: (s) => ETIQUETA_ESTADO[s.estado] },
  { titulo: 'Cliente', valor: (s) => s.cliente.nombre },
  { titulo: 'Correo', valor: (s) => s.cliente.correo },
  { titulo: 'Teléfono', valor: (s) => s.cliente.telefono },
  { titulo: 'Tipo de cliente', valor: (s) => TIPOS_CLIENTE[s.cliente.tipo] },
  { titulo: 'Empresa', valor: (s) => s.cliente.empresa },
  { titulo: 'Precio estimado', valor: (s) => s.precioEstimado },
  { titulo: 'Precio final', valor: (s) => s.precioFinal },
  { titulo: 'Días de entrega', valor: (s) => s.diasEntrega },
  { titulo: 'Aprobado', valor: (s) => fecha(s.aprobadoEn) },
  { titulo: 'Entregado', valor: (s) => fecha(s.entregadoEn) },
  { titulo: 'Pagado', valor: (s) => fecha(s.pagadoEn) },
  { titulo: 'Origen', valor: (s) => canalDeOrigen(s.origen) },
  { titulo: 'utm_campaign', valor: (s) => s.origen?.utm_campaign },
  { titulo: 'Descripción', valor: (s) => s.descripcion },
];

const columnasClientes: Columna<ClienteConTotales>[] = [
  { titulo: 'Nombre', valor: (c) => c.nombre },
  { titulo: 'Correo', valor: (c) => c.correo },
  { titulo: 'Teléfono', valor: (c) => c.telefono },
  { titulo: 'Tipo', valor: (c) => TIPOS_CLIENTE[c.tipo] },
  { titulo: 'Empresa', valor: (c) => c.empresa },
  { titulo: 'NIT', valor: (c) => c.nit },
  { titulo: 'Ciudad', valor: (c) => c.ciudad },
  { titulo: 'Cliente desde', valor: (c) => fecha(c.creadoEn) },
  { titulo: 'Solicitudes', valor: (c) => c.solicitudes },
  { titulo: 'Última solicitud', valor: (c) => fecha(c.ultimaSolicitud) },
  { titulo: 'Total pagado', valor: (c) => c.totalPagado },
  { titulo: 'Origen', valor: (c) => canalDeOrigen(c.origenPrimero) },
];

export const GET: APIRoute = async ({ params, locals }) => {
  const repo = locals.repoAdmin!;
  const tipo = (params.tipo ?? '').replace(/\.csv$/, '');
  let csv: string;
  if (tipo === 'solicitudes') csv = aCsv(columnasSolicitudes, await repo.listarSolicitudes({ limite: 5000 }));
  else if (tipo === 'clientes') csv = aCsv(columnasClientes, await repo.listarClientes());
  else return new Response('Exportación desconocida', { status: 404 });

  const hoy = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tipo}-${hoy}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
};
