/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Administrador con sesión en el panel (null si no hay sesión). */
    admin: { correo: string; demo: boolean } | null;
    /** Repositorio del panel con la sesión del administrador. */
    repoAdmin?: import('@/lib/datos/tipos').RepositorioAdmin;
    /** Cliente de Supabase con la sesión (cookies) de esta petición. */
    supabase?: import('@supabase/supabase-js').SupabaseClient;
  }
}
