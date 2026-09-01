-- ============================================================
--  Clinic Task Tracker — database schema
--  Run this once in Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enumerated types ----------
do $$ begin
  create type task_priority as enum ('Low', 'Medium', 'High');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('Pending', 'In Progress', 'Completed', 'Delayed');
exception when duplicate_object then null; end $$;


-- ---------- Staff ----------
create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists staff_name_unique on staff (lower(name));


-- ---------- Patients ----------
-- Patients are optional. A task can carry a plain patient name, but linking
-- to a patient row lets you pull up every task for that person later.
create table if not exists patients (
  id            uuid primary key default gen_random_uuid(),
  patient_code  text unique,          -- your clinic's own file number, e.g. AZS-1042
  name          text not null,
  phone         text,
  created_at    timestamptz not null default now()
);

create index if not exists patients_name_idx on patients using gin (to_tsvector('simple', name));


-- ---------- Tasks ----------
create table if not exists tasks (
  id             uuid primary key default gen_random_uuid(),
  task_no        bigint generated always as identity,   -- human-readable: TSK-0001
  patient_id     uuid references patients(id) on delete set null,
  patient_name   text not null,
  patient_code   text,
  description    text not null,
  assigned_to    uuid references staff(id) on delete set null,
  assigned_name  text not null,        -- denormalised so history survives staff changes
  priority       task_priority not null default 'Medium',
  due_at         timestamptz,
  status         task_status not null default 'Pending',
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create unique index if not exists tasks_task_no_unique on tasks (task_no);
create index if not exists tasks_status_idx      on tasks (status);
create index if not exists tasks_assigned_idx    on tasks (assigned_to);
create index if not exists tasks_priority_idx    on tasks (priority);
create index if not exists tasks_due_idx         on tasks (due_at);
create index if not exists tasks_patient_idx     on tasks (patient_id);


-- ---------- Notes / comments ----------
create table if not exists task_notes (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  author      text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists task_notes_task_idx on task_notes (task_id, created_at desc);


-- ---------- Keep updated_at / completed_at honest ----------
create or replace function touch_task() returns trigger as $$
begin
  new.updated_at := now();
  if new.status = 'Completed' and (old.status is distinct from 'Completed') then
    new.completed_at := now();
  elsif new.status <> 'Completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_touch on tasks;
create trigger tasks_touch before update on tasks
  for each row execute function touch_task();


-- ---------- Lock the tables down ----------
-- Row Level Security is ON with no public policies, so the anon key can read
-- nothing. All access goes through the Next.js server using the service role
-- key, which bypasses RLS. Never put the service role key in browser code.
alter table staff       enable row level security;
alter table patients    enable row level security;
alter table tasks       enable row level security;
alter table task_notes  enable row level security;


-- ---------- Seed your current team ----------
insert into staff (name, role) values
  ('Dr. Radhika',  'Associate Dentist'),
  ('Dr. Jhanvi',   'Associate Dentist'),
  ('Pushparaj',    'Lab & Office Coordinator'),
  ('Vishwa',       'Chairside Assistant'),
  ('Krisha',       'Chairside Assistant')
on conflict do nothing;
