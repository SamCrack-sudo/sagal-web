/**
 * Notificaciones de la fase 2: cambios de estado al cliente y aprobaciones al dueño.
 */
import { entorno } from './entorno';
import { enviarCorreo } from './correo';
import { correoClienteActualizacion, correoDuenoAprobacion } from './plantillas';
import { ESTADO_PARA_CLIENTE } from '@/lib/gestion/estados';
import { formatoCOP } from '@/lib/precios/motor';
import type { DetalleSolicitud } from '@/lib/datos/tipos';

export interface ResultadoAviso {
  enviado: boolean;
  motivo?: string;
}

export async function avisarCliente(
  d: DetalleSolicitud,
  opciones: { sitio: string; mensaje?: string | null },
): Promise<ResultadoAviso> {
  const env = entorno();
  if (!env.resendApiKey) return { enviado: false, motivo: 'Los correos están desactivados (falta configurar Resend).' };
  const s = d.solicitud;
  const estado = ESTADO_PARA_CLIENTE[s.estado];
  const precio = s.precioFinal ?? s.precioEstimado;
  const correo = correoClienteActualizacion({
    nombre: d.cliente.nombre,
    codigo: s.codigo,
    estadoTitulo: estado.titulo,
    estadoTexto: estado.texto,
    mensaje: opciones.mensaje,
    precio: precio !== null ? formatoCOP(precio) : null,
    diasEntrega: s.estado === 'cotizado' ? s.diasEntrega : null,
    enlacePago: s.estado !== 'pagado' && s.estado !== 'cancelado' ? s.enlacePago : null,
    enlaceSeguimiento: `${opciones.sitio}/pedido/${s.codigo}`,
    puedeAprobar: s.estado === 'cotizado',
  });
  const r = await enviarCorreo(
    { para: d.cliente.correo, asunto: correo.asunto, html: correo.html, texto: correo.texto, responderA: env.correoDueno },
    { apiKey: env.resendApiKey, remitente: env.remitente },
  );
  if (!r.ok) console.error('[aviso cliente]', r.error);
  return r.ok ? { enviado: true } : { enviado: false, motivo: 'Resend rechazó el envío; revisa los registros.' };
}

export async function avisarAprobacion(d: DetalleSolicitud, sitio: string): Promise<void> {
  const env = entorno();
  if (!env.resendApiKey) return;
  const precio = d.solicitud.precioFinal ?? d.solicitud.precioEstimado;
  const correo = correoDuenoAprobacion({
    codigo: d.solicitud.codigo,
    nombre: d.cliente.nombre,
    precio: precio !== null ? formatoCOP(precio) : null,
    enlacePanel: `${sitio}/admin/solicitudes/${d.solicitud.id}`,
  });
  const r = await enviarCorreo(
    { para: env.correoDueno, asunto: correo.asunto, html: correo.html, texto: correo.texto, responderA: d.cliente.correo },
    { apiKey: env.resendApiKey, remitente: env.remitente },
  );
  if (!r.ok) console.error('[aviso aprobación]', r.error);
}
