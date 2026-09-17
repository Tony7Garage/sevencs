-- ROLES
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- PROFILES
create table public.profiles (
  id uuid primary key,
  player_id text not null unique,
  display_name text not null,
  avatar_url text,
  elo text not null default 'Bronze',
  points integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  total_kills integer not null default 0,
  total_deaths integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.gen_player_id()
returns text language plpgsql as $$
declare candidate text;
begin
  loop
    candidate := lpad((floor(random()*1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.profiles where player_id = candidate);
  end loop;
  return candidate;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, player_id, display_name, avatar_url)
  values (
    new.id,
    public.gen_player_id(),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1), 'Jogador'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- MATCHES
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  result text not null check (result in ('win','loss')),
  kills integer not null default 0,
  deaths integer not null default 0,
  kd numeric(6,2) not null default 0,
  points_delta integer not null default 0,
  multiplier numeric(4,1) not null default 1,
  elo_before text not null,
  elo_after text not null,
  points_before integer not null default 0,
  points_after integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "matches readable" on public.matches for select using (true);
create policy "insert own matches" on public.matches for insert to authenticated with check (user_id = auth.uid());

-- TEAMS
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teams to authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;
create policy "teams readable" on public.teams for select to authenticated using (true);
create policy "create team" on public.teams for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates team" on public.teams for update to authenticated using (owner_id = auth.uid());
create policy "owner deletes team" on public.teams for delete to authenticated using (owner_id = auth.uid());

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);
grant select, insert, delete on public.team_members to authenticated;
grant all on public.team_members to service_role;
alter table public.team_members enable row level security;
create policy "members readable" on public.team_members for select to authenticated using (true);
create policy "join team" on public.team_members for insert to authenticated with check (user_id = auth.uid());
create policy "leave team" on public.team_members for delete to authenticated using (user_id = auth.uid());

-- CHAT
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  channel text not null default 'geral',
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages readable" on public.messages for select to authenticated using (true);
create policy "send own message" on public.messages for insert to authenticated with check (user_id = auth.uid());
alter publication supabase_realtime add table public.messages;

-- GLOBAL SETTINGS
create table public.global_settings (
  id integer primary key default 1 check (id = 1),
  multiplier_enabled boolean not null default false,
  multiplier numeric(4,1) not null default 1,
  updated_at timestamptz not null default now()
);
grant select on public.global_settings to authenticated, anon;
grant all on public.global_settings to service_role;
alter table public.global_settings enable row level security;
create policy "settings readable" on public.global_settings for select using (true);
insert into public.global_settings (id) values (1) on conflict do nothing;