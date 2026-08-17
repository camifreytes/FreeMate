-- ============================================================
-- Migración: lugares de encuentro propuestos y votados dentro de cada juntada
-- Pegá este script en Supabase -> SQL Editor -> New query -> Run
-- ============================================================

create table if not exists meetup_lugares (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references meetups(id) on delete cascade,
  propuesto_por uuid not null references profiles(id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now()
);

create table if not exists meetup_lugar_votos (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references meetups(id) on delete cascade,
  lugar_id uuid not null references meetup_lugares(id) on delete cascade,
  perfil_id uuid not null references profiles(id) on delete cascade,
  votado_en timestamptz not null default now(),
  unique (meetup_id, perfil_id) -- una persona vota UN solo lugar por juntada (puede cambiarlo)
);

alter table meetup_lugares enable row level security;
alter table meetup_lugar_votos enable row level security;

-- Solo miembros del grupo de esa juntada pueden ver/proponer/votar lugares
drop policy if exists "miembros ven lugares" on meetup_lugares;
create policy "miembros ven lugares"
  on meetup_lugares for select
  using (
    exists (
      select 1 from meetups m
      join group_members gm on gm.grupo_id = m.grupo_id
      where m.id = meetup_lugares.meetup_id and gm.perfil_id = auth.uid()
    )
  );

drop policy if exists "miembros proponen lugares" on meetup_lugares;
create policy "miembros proponen lugares"
  on meetup_lugares for insert
  with check (
    propuesto_por = auth.uid()
    and exists (
      select 1 from meetups m
      join group_members gm on gm.grupo_id = m.grupo_id
      where m.id = meetup_lugares.meetup_id and gm.perfil_id = auth.uid()
    )
  );

drop policy if exists "autor borra su lugar" on meetup_lugares;
create policy "autor borra su lugar"
  on meetup_lugares for delete
  using (propuesto_por = auth.uid());

drop policy if exists "miembros ven votos" on meetup_lugar_votos;
create policy "miembros ven votos"
  on meetup_lugar_votos for select
  using (
    exists (
      select 1 from meetups m
      join group_members gm on gm.grupo_id = m.grupo_id
      where m.id = meetup_lugar_votos.meetup_id and gm.perfil_id = auth.uid()
    )
  );

drop policy if exists "miembros votan" on meetup_lugar_votos;
create policy "miembros votan"
  on meetup_lugar_votos for insert
  with check (
    perfil_id = auth.uid()
    and exists (
      select 1 from meetups m
      join group_members gm on gm.grupo_id = m.grupo_id
      where m.id = meetup_lugar_votos.meetup_id and gm.perfil_id = auth.uid()
    )
  );

drop policy if exists "miembros cambian su voto" on meetup_lugar_votos;
create policy "miembros cambian su voto"
  on meetup_lugar_votos for update
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

drop policy if exists "miembros sacan su voto" on meetup_lugar_votos;
create policy "miembros sacan su voto"
  on meetup_lugar_votos for delete
  using (perfil_id = auth.uid());
