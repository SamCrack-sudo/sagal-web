/**
 * Punto de acceso a los datos. Elige Supabase si está configurado y, si no,
 * el repositorio de demostración en memoria.
 */
import { entorno } from '@/lib/servidor/entorno';
import { repositorioDemo } from './demo';
import { crearRepositorioPublico } from './supabase';
import type { RepositorioPublico } from './tipos';

export type * from './tipos';

let enCache: { clave: string; repo: RepositorioPublico } | null = null;

/** Repositorio para el sitio público (solo en el servidor). */
export function repositorioPublico(): RepositorioPublico {
  const { supabase } = entorno();
  if (!supabase) return repositorioDemo;
  const clave = `${supabase.url}|${supabase.servicio.slice(-6)}`;
  if (enCache?.clave !== clave) enCache = { clave, repo: crearRepositorioPublico(supabase) };
  return enCache.repo;
}
