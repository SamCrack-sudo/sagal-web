/**
 * Descarga de un archivo de cliente. Solo administradores (middleware).
 * En Supabase redirige a una URL firmada de 2 minutos.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, redirect }) => {
  const archivo = await locals.repoAdmin!.descargarArchivo(params.id ?? '');
  if (!archivo) return new Response('Archivo no encontrado', { status: 404 });
  if (archivo.url) return redirect(archivo.url, 302);
  if (archivo.contenido) {
    return new Response(archivo.contenido, {
      headers: {
        'Content-Type': archivo.contenido.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  }
  return new Response('Este archivo es de ejemplo (modo demo) y no tiene contenido.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
