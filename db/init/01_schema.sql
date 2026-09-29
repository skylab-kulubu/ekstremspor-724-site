-- ============================================================
-- Campus Extreme Sports Event Platform — schema
-- Pure Postgres, no Supabase. Auth handled in the Next.js app,
-- sessions are stored in this DB. RLS is OFF — the application
-- enforces authorization through pg roles and server actions.
-- Realtime is delivered via LISTEN/NOTIFY on a trigger that
-- fires after every INSERT/UPDATE/DELETE.
-- ============================================================

create extension if not exists pgcrypto;

-- ─── profiles ───────────────────────────────────────────────
create table if not exists profiles (
  id                       uuid primary key default gen_random_uuid(),
  full_name                text not null,
  email                    text not null unique,
  phone                    text not null,
  password_hash            text,
  equipment_need           text not null check (
                             equipment_need in ('bicycle','skates','skateboard','none')
                           ),
  equipment_request_status text not null default 'not_needed'
                             check (equipment_request_status in
                               ('pending','fulfilled','rejected','not_needed')),
  role                     text not null default 'user'
                             check (role in ('user','admin')),
  is_banned                boolean not null default false,
  created_at               timestamptz not null default now()
);

-- ─── sessions ───────────────────────────────────────────────
create table if not exists sessions (
  token       text primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ─── equipments ─────────────────────────────────────────────
create table if not exists equipments (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('bicycle','skates','skateboard')),
  status      text not null default 'available'
                check (status in ('available','in_use','damaged')),
  code        text,
  assigned_to uuid references profiles(id) on delete set null,
  assigned_at timestamptz,
  returned_at timestamptz
);

-- ─── activities ─────────────────────────────────────────────
create table if not exists activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  distance     float not null,
  vehicle_type text not null check (
                 vehicle_type in ('bicycle','skates','skateboard','running')
               ),
  source       text not null check (source in ('on_site','remote')),
  evidence_url text,
  date_range   text,
  status       text not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now()
);

-- ─── event_config ───────────────────────────────────────────
create table if not exists event_config (
  id          uuid primary key default gen_random_uuid(),
  event_name  text not null,
  start_date  date not null,
  end_date    date not null,
  target_km   integer not null default 5000,
  active_day  integer not null default 1 check (active_day in (1,2,3)),
  forest_name text
);

insert into event_config (event_name, start_date, end_date, target_km, active_day)
select 'Campus Extreme Sports Event', '2025-01-01'::date, '2025-01-03'::date, 5000, 1
where not exists (select 1 from event_config);

-- ─── indexes ────────────────────────────────────────────────
create index if not exists idx_activities_status_created_at on activities (status, created_at);
create index if not exists idx_activities_user_id           on activities (user_id);
create index if not exists idx_activities_source_status     on activities (source, status);
create index if not exists idx_equipments_status            on equipments (status);
create index if not exists idx_equipments_assigned_to       on equipments (assigned_to);
create index if not exists idx_equipments_type_status       on equipments (type, status);
create index if not exists idx_profiles_email               on profiles (email);
create index if not exists idx_sessions_user_id             on sessions (user_id);
create index if not exists idx_sessions_expires_at          on sessions (expires_at);

-- ─── LISTEN/NOTIFY change-event infrastructure ──────────────
-- Channels:
--   profiles_changes, equipments_changes, activities_changes, event_config_changes
-- Payload shape: { "op": "INSERT|UPDATE|DELETE", "id": "<uuid>" }
create or replace function notify_change()
  returns trigger
  language plpgsql
as $$
declare
  row_id text;
  payload text;
begin
  if (tg_op = 'DELETE') then
    row_id := (old.id)::text;
  else
    row_id := (new.id)::text;
  end if;
  payload := json_build_object('op', tg_op, 'id', row_id)::text;
  perform pg_notify(tg_table_name || '_changes', payload);
  return null;
end;
$$;

drop trigger if exists activities_notify   on activities;
create trigger activities_notify
  after insert or update or delete on activities
  for each row execute function notify_change();

drop trigger if exists equipments_notify   on equipments;
create trigger equipments_notify
  after insert or update or delete on equipments
  for each row execute function notify_change();

drop trigger if exists profiles_notify     on profiles;
create trigger profiles_notify
  after insert or update or delete on profiles
  for each row execute function notify_change();

drop trigger if exists event_config_notify on event_config;
create trigger event_config_notify
  after insert or update or delete on event_config
  for each row execute function notify_change();
