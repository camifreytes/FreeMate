-- ============================================================
-- Migración para integrar Google Calendar en FreeMate
-- Pegá este script completo en Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- 1) Tabla nueva: guarda quién conectó Google Calendar y sus tokens
create table if not exists google_calendar_conexiones (
  perfil_id uuid primary key references profiles(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expira_en timestamptz,
  sync_token text,
  canal_id text,
  recurso_id text,
  canal_token text,
  canal_expira timestamptz,
  conectado boolean not null default true,
  ultima_sync timestamptz,
  creado_en timestamptz not null default now()
);

-- Índice para que el webhook encuentre rápido la conexión por canal_id
create index if not exists idx_gcal_canal_id on google_calendar_conexiones (canal_id);

alter table google_calendar_conexiones enable row level security;

-- Cada persona solo puede ver y borrar SU PROPIA conexión.
-- (Insertar/actualizar lo hace únicamente el servidor con la service_role key,
-- por eso no hace falta una política de "insert"/"update" para usuarios comunes.)
drop policy if exists "cada uno ve su conexion" on google_calendar_conexiones;
create policy "cada uno ve su conexion"
  on google_calendar_conexiones for select
  using (auth.uid() = perfil_id);

drop policy if exists "cada uno borra su conexion" on google_calendar_conexiones;
create policy "cada uno borra su conexion"
  on google_calendar_conexiones for delete
  using (auth.uid() = perfil_id);

-- 2) Columnas nuevas en "blocks" para identificar los eventos que vienen de Google
alter table blocks add column if not exists google_event_id text;
alter table blocks add column if not exists origen text not null default 'manual';

-- Evita duplicar el mismo evento de Google dos veces para la misma persona
create unique index if not exists blocks_google_event_unico
  on blocks (perfil_id, google_event_id)
  where google_event_id is not null;
