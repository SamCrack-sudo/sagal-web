/**
 * Ejecuta la migración en un Postgres real (PGlite, en memoria) con stubs
 * mínimos de los esquemas `auth` y `storage` de Supabase, y comprueba las
 * políticas RLS con los roles anon, authenticated (no admin) y admin.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('./migrations/', import.meta.url));

const STUBS_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
`;

// Supabase otorga estos permisos por defecto en el esquema public; RLS decide el resto.
const PERMISOS_SUPABASE = `
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  grant all on all sequences in schema public to anon, authenticated, service_role;
  grant select on storage.objects to authenticated;
`;

let db: PGlite;

async function como<T>(rol: 'anon' | 'authenticated' | 'service_role', correo: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${rol}`);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [correo ? JSON.stringify({ email: correo, role: rol }) : '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUBS_SUPABASE);
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(dir + archivo, 'utf8'));
  }
  await db.exec(PERMISOS_SUPABASE);
  await db.exec(readFileSync(fileURLToPath(new URL('./seed.sql', import.meta.url)), 'utf8'));

  // Datos de prueba (como superusuario, equivalente a la clave de servicio).
  await db.exec(`
    insert into public.administradores (correo) values ('admin@taller.co');
    insert into public.clientes (id, nombre, correo) values ('00000000-0000-0000-0000-000000000001', 'Ana', 'ana@ejemplo.co');
    insert into public.solicitudes (id, codigo, cliente_id, tipo)
      values ('00000000-0000-0000-0000-0000000000a1', 'SR-ABCDE-FGH23', '00000000-0000-0000-0000-000000000001', 'cotizacion');
    insert into public.eventos (solicitud_id, tipo, mensaje) values ('00000000-0000-0000-0000-0000000000a1', 'creada', 'hola');
    insert into storage.objects (bucket_id, name) values ('archivos', 'x/pieza.stl');
  `);
});

describe('esquema y semilla', () => {
  it('crea el bucket privado y siembra la configuración de precios', async () => {
    const b = await db.query<{ public: boolean }>(`select public from storage.buckets where id = 'archivos'`);
    expect(b.rows[0]?.public).toBe(false);
    const c = await db.query<{ valor: { materiales: unknown[]; esDemo: boolean } }>(`select valor from public.configuracion where clave = 'precios'`);
    expect(c.rows[0]?.valor.materiales.length).toBeGreaterThan(0);
  });

  it('valida el formato del código de seguimiento', async () => {
    await expect(
      db.exec(`insert into public.solicitudes (codigo, cliente_id, tipo) values ('SR-00000-OOOOO', '00000000-0000-0000-0000-000000000001', 'contacto')`),
    ).rejects.toThrow();
  });

  it('marca las fechas de los hitos al cambiar de estado', async () => {
    await db.exec(`update public.solicitudes set estado = 'aprobado' where codigo = 'SR-ABCDE-FGH23'`);
    await db.exec(`update public.solicitudes set estado = 'pagado' where codigo = 'SR-ABCDE-FGH23'`);
    const r = await db.query<{ aprobado_en: Date | null; pagado_en: Date | null }>(
      `select aprobado_en, pagado_en from public.solicitudes where codigo = 'SR-ABCDE-FGH23'`,
    );
    expect(r.rows[0]?.aprobado_en).not.toBeNull();
    expect(r.rows[0]?.pagado_en).not.toBeNull();
  });
});

describe('RLS: visitante anónimo', () => {
  it('no ve clientes, solicitudes, eventos ni archivos', async () => {
    await como('anon', null, async () => {
      for (const t of ['clientes', 'solicitudes', 'eventos', 'archivos', 'administradores']) {
        const r = await db.query(`select * from public.${t}`);
        expect(r.rows, t).toHaveLength(0);
      }
    });
  });

  it('no puede crear ni modificar solicitudes', async () => {
    await como('anon', null, async () => {
      await expect(
        db.exec(`insert into public.clientes (nombre, correo) values ('X', 'x@x.co')`),
      ).rejects.toThrow(/row-level security/);
      const r = await db.query(`update public.solicitudes set estado = 'pagado' returning id`);
      expect(r.rows).toHaveLength(0);
    });
  });

  it('sí lee la configuración de precios (la usa el cotizador)', async () => {
    await como('anon', null, async () => {
      const r = await db.query(`select clave from public.configuracion`);
      expect(r.rows).toHaveLength(1);
      await expect(db.exec(`update public.configuracion set valor = '{}' where clave = 'precios'`)).resolves.toBeDefined();
      const sigue = await db.query<{ n: number }>(`select jsonb_array_length(valor->'materiales') as n from public.configuracion`);
      expect(sigue.rows[0]?.n).toBeGreaterThan(0); // la actualización no afectó filas
    });
  });
});

describe('RLS: usuario autenticado que no es administrador', () => {
  it('no ve datos ni archivos', async () => {
    await como('authenticated', 'intruso@ejemplo.co', async () => {
      expect((await db.query(`select * from public.solicitudes`)).rows).toHaveLength(0);
      expect((await db.query(`select * from public.clientes`)).rows).toHaveLength(0);
      expect((await db.query(`select * from storage.objects`)).rows).toHaveLength(0);
      expect((await db.query<{ es_admin: boolean }>(`select public.es_admin()`)).rows[0]?.es_admin).toBe(false);
    });
  });
});

describe('RLS: administrador', () => {
  it('ve y edita todo, incluidos los archivos', async () => {
    await como('authenticated', 'ADMIN@taller.co', async () => {
      expect((await db.query<{ es_admin: boolean }>(`select public.es_admin()`)).rows[0]?.es_admin).toBe(true);
      expect((await db.query(`select * from public.solicitudes`)).rows).toHaveLength(1);
      expect((await db.query(`select * from public.eventos`)).rows.length).toBeGreaterThan(0);
      expect((await db.query(`select * from storage.objects`)).rows).toHaveLength(1);
      const r = await db.query(`update public.solicitudes set precio_final = 50000 returning id`);
      expect(r.rows).toHaveLength(1);
      await db.exec(`insert into public.eventos (solicitud_id, tipo, mensaje, autor) values ('00000000-0000-0000-0000-0000000000a1', 'nota', 'interna', 'admin@taller.co')`);
    });
  });

  it('no puede autoasignarse como administrador a otro correo', async () => {
    await como('authenticated', 'admin@taller.co', async () => {
      await expect(db.exec(`insert into public.administradores (correo) values ('otro@x.co')`)).rejects.toThrow(/row-level security/);
    });
  });
});
