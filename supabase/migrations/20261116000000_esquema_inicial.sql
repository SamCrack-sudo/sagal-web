-- ════════════════════════════════════════════════════════════════════════
-- SAGAL Robotics · Esquema inicial (fase 2: gestión)
--
-- Modelo de seguridad
-- • Todas las tablas tienen Row Level Security (RLS) activada.
-- • Los visitantes (rol anon) NO leen ni escriben tablas directamente: las
--   solicitudes y cotizaciones entran por las rutas /api del sitio, que usan
--   la clave de servicio en el servidor.
-- • Los administradores (rol authenticated + correo en public.administradores)
--   leen y editan todo. El sitio sincroniza esa tabla con ADMIN_EMAILS en cada
--   inicio de sesión.
-- • La única lectura pública es la configuración de precios: el cotizador la
--   necesita en el navegador para calcular el precio en vivo.
-- ════════════════════════════════════════════════════════════════════════

-- ── Tipos ───────────────────────────────────────────────────────────────
create type public.estado_solicitud as enum (
  'nuevo', 'cotizado', 'aprobado', 'en_produccion', 'listo', 'entregado', 'pagado', 'cancelado'
);

create type public.tipo_solicitud as enum ('cotizacion', 'diseno_cad', 'contacto', 'empresa', 'educacion');

create type public.tipo_cliente as enum ('persona', 'empresa', 'colegio');

-- ── Administradores ─────────────────────────────────────────────────────
create table public.administradores (
  correo text primary key check (correo = lower(correo) and position('@' in correo) > 1),
  creado_en timestamptz not null default now()
);

comment on table public.administradores is
  'Correos con acceso al panel. Se sincroniza con ADMIN_EMAILS al iniciar sesión.';

-- ¿El usuario de la sesión actual es administrador?
-- security definer: consulta administradores sin depender de sus propias políticas.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.administradores a
    where a.correo = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- Mantiene actualizado_en al día.
create or replace function public.tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- ── Clientes ────────────────────────────────────────────────────────────
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 1 and 160),
  correo text not null unique check (correo = lower(correo)),
  telefono text check (char_length(telefono) <= 30),
  tipo public.tipo_cliente not null default 'persona',
  empresa text check (char_length(empresa) <= 160),
  nit text check (char_length(nit) <= 30),
  ciudad text check (char_length(ciudad) <= 160),
  facturacion jsonb not null default '{}'::jsonb,
  notas text,
  -- Origen de la primera visita registrada (UTM, referente, página de llegada).
  origen_primero jsonb
);

create trigger clientes_actualizado
  before update on public.clientes
  for each row execute function public.tocar_actualizado();

-- ── Solicitudes (cotizaciones y pedidos) ────────────────────────────────
-- Una cotización se convierte en pedido cuando el cliente la aprueba: es la
-- misma fila, que avanza por los estados.
create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique
    check (codigo ~ '^[A-Z0-9]{1,8}-[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$'),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  tipo public.tipo_solicitud not null,
  estado public.estado_solicitud not null default 'nuevo',
  -- Mensaje o descripción escrita por el cliente.
  descripcion text,
  -- Campos propios de cada formulario (empresa, medidas, servicio, notas…).
  datos jsonb not null default '{}'::jsonb,
  -- Cotizador: opciones elegidas, medidas del archivo y desglose del motor.
  parametros jsonb,
  metricas jsonb,
  desglose jsonb,
  precio_estimado numeric(14, 2) check (precio_estimado >= 0),
  precio_final numeric(14, 2) check (precio_final >= 0),
  dias_entrega integer check (dias_entrega between 0 and 365),
  enlace_pago text check (enlace_pago is null or enlace_pago ~ '^https://'),
  -- UTM y referente con los que llegó esta solicitud.
  origen jsonb,
  cotizado_en timestamptz,
  aprobado_en timestamptz,
  entregado_en timestamptz,
  pagado_en timestamptz
);

create index solicitudes_estado_idx on public.solicitudes (estado);
create index solicitudes_creado_idx on public.solicitudes (creado_en desc);
create index solicitudes_cliente_idx on public.solicitudes (cliente_id);

-- Registra la fecha en que una solicitud llega por primera vez a cada hito.
create or replace function public.marcar_hitos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'cotizado' and new.cotizado_en is null then new.cotizado_en = now(); end if;
    if new.estado = 'aprobado' and new.aprobado_en is null then new.aprobado_en = now(); end if;
    if new.estado = 'entregado' and new.entregado_en is null then new.entregado_en = now(); end if;
    if new.estado = 'pagado' and new.pagado_en is null then new.pagado_en = now(); end if;
  end if;
  return new;
end;
$$;

create trigger solicitudes_actualizado
  before update on public.solicitudes
  for each row execute function public.tocar_actualizado();

create trigger solicitudes_hitos
  before update of estado on public.solicitudes
  for each row execute function public.marcar_hitos();

-- ── Archivos (STL, 3MF, fotos, planos) ──────────────────────────────────
create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes (id) on delete cascade,
  creado_en timestamptz not null default now(),
  -- Ruta dentro del bucket privado "archivos" de Storage.
  ruta text not null unique,
  nombre text not null,
  tamano bigint check (tamano >= 0),
  tipo_mime text,
  rol text not null check (rol in ('modelo', 'adjunto', 'foto'))
);

create index archivos_solicitud_idx on public.archivos (solicitud_id);

-- ── Historial ───────────────────────────────────────────────────────────
create table public.eventos (
  id bigint generated always as identity primary key,
  solicitud_id uuid not null references public.solicitudes (id) on delete cascade,
  creado_en timestamptz not null default now(),
  tipo text not null
    check (tipo in ('creada', 'estado', 'precio', 'nota', 'notificacion', 'aprobacion_cliente')),
  estado_anterior public.estado_solicitud,
  estado_nuevo public.estado_solicitud,
  mensaje text,
  -- true: el cliente lo ve en /pedido/[codigo]. Las notas internas van en false.
  visible_cliente boolean not null default false,
  autor text not null default 'sistema',
  detalle jsonb not null default '{}'::jsonb
);

create index eventos_solicitud_idx on public.eventos (solicitud_id, creado_en);

-- ── Configuración editable desde el panel ───────────────────────────────
create table public.configuracion (
  clave text primary key check (clave in ('precios')),
  valor jsonb not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por text
);

create trigger configuracion_actualizado
  before update on public.configuracion
  for each row execute function public.tocar_actualizado();

-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════
alter table public.administradores enable row level security;
alter table public.clientes enable row level security;
alter table public.solicitudes enable row level security;
alter table public.archivos enable row level security;
alter table public.eventos enable row level security;
alter table public.configuracion enable row level security;

create policy "Administradores: los admins ven la lista"
  on public.administradores for select to authenticated
  using (public.es_admin());

create policy "Clientes: solo administradores"
  on public.clientes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "Solicitudes: solo administradores"
  on public.solicitudes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "Archivos: solo administradores"
  on public.archivos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "Eventos: solo administradores"
  on public.eventos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "Configuración: lectura pública de precios"
  on public.configuracion for select to anon, authenticated
  using (clave = 'precios');

create policy "Configuración: administradores editan"
  on public.configuracion for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ════════════════════════════════════════════════════════════════════════
-- Storage: bucket privado para STL, 3MF, fotos y planos (máx. 50 MB)
-- ════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit)
values ('archivos', 'archivos', false, 52428800)
on conflict (id) do nothing;

-- Solo los administradores descargan (con URL firmada). Las subidas las hace
-- el servidor con la clave de servicio, que no pasa por estas políticas.
create policy "Archivos de clientes: lectura de administradores"
  on storage.objects for select to authenticated
  using (bucket_id = 'archivos' and public.es_admin());

create policy "Archivos de clientes: administradores eliminan"
  on storage.objects for delete to authenticated
  using (bucket_id = 'archivos' and public.es_admin());
