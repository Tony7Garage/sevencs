-- Seven CS V3.1 Admin management and activity

create table if not exists public.admin_access (
  id uuid primary key default gen_random_uuid(),
  player_id text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant all on public.admin_access to service_role;
alter table public.admin_access enable row level security;

insert into public.admin_access (player_id)
select '535226'
where exists (select 1 from public.profiles where player_id = '535226')
on conflict (player_id) do nothing;

alter table public.profiles add column if not exists last_seen timestamptz;
create index if not exists idx_profiles_last_seen on public.profiles(last_seen desc);
