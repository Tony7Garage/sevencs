-- Seven CS V3 Beta
-- Core: sequential player/community IDs, communities, DMs, team vacancies and match review.

-- Sequential player IDs (keep existing IDs unique while moving new users to 0001, 0002...)
create sequence if not exists public.player_id_seq;

with numbered as (
  select id, lpad(row_number() over (order by created_at, id)::text, 4, '0') as new_id
  from public.profiles
)
update public.profiles p
set player_id = n.new_id
from numbered n
where p.id = n.id;

select setval(
  'public.player_id_seq',
  greatest(coalesce((select max(player_id::bigint) from public.profiles where player_id ~ '^[0-9]+$'), 0), 0),
  true
);

create or replace function public.gen_player_id()
returns text language plpgsql as $$
declare candidate text;
begin
  loop
    candidate := lpad(nextval('public.player_id_seq')::text, 4, '0');
    exit when not exists (select 1 from public.profiles where player_id = candidate);
  end loop;
  return candidate;
end $$;

-- Teams
alter table public.teams
  add column if not exists cs_code text,
  add column if not exists slots_remaining integer not null default 4;

alter table public.teams
  drop constraint if exists teams_slots_remaining_check;
alter table public.teams
  add constraint teams_slots_remaining_check check (slots_remaining between 0 and 10);

-- Communities
create sequence if not exists public.community_id_seq;
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  community_id text not null unique,
  name text not null,
  description text,
  image_url text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  access_type text not null default 'public' check (access_type in ('public','invite','approval','rank')),
  min_rank text,
  created_at timestamptz not null default now()
);

create or replace function public.gen_community_id()
returns text language plpgsql as $$
begin
  return lpad(nextval('public.community_id_seq')::text, 4, '0');
end $$;

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','pending')),
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create table if not exists public.community_channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  type text not null default 'text' check (type in ('text','voice')),
  created_at timestamptz not null default now()
);

-- DMs
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.dm_members (
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Match review workflow.
alter table public.matches
  add column if not exists status text not null default 'pending',
  add column if not exists screenshot_url text,
  add column if not exists submitted_result text,
  add column if not exists submitted_kills integer,
  add column if not exists submitted_deaths integer,
  add column if not exists verified_result text,
  add column if not exists verified_kills integer,
  add column if not exists verified_deaths integer,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check check (status in ('pending','approved','invalid'));

-- A pending match must not be treated as a completed match by clients.
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_user_created on public.matches(user_id, created_at desc);
create index if not exists idx_community_members_user on public.community_members(user_id);
create index if not exists idx_dm_members_user on public.dm_members(user_id);
create index if not exists idx_dm_messages_conversation on public.dm_messages(conversation_id, created_at);

-- RLS
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_channels enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_members enable row level security;
alter table public.dm_messages enable row level security;

create policy "communities readable" on public.communities for select to authenticated using (
  access_type = 'public'
  or owner_id = auth.uid()
  or exists (select 1 from public.community_members m where m.community_id = id and m.user_id = auth.uid() and m.status = 'active')
);
create policy "create own community" on public.communities for insert to authenticated with check (owner_id = auth.uid());
create policy "owner updates community" on public.communities for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes community" on public.communities for delete to authenticated using (owner_id = auth.uid());

create policy "community members readable" on public.community_members for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid())
);
create policy "join community" on public.community_members for insert to authenticated with check (user_id = auth.uid());
create policy "leave community" on public.community_members for delete to authenticated using (user_id = auth.uid());
create policy "community channels readable" on public.community_channels for select to authenticated using (
  exists (select 1 from public.community_members m where m.community_id = community_id and m.user_id = auth.uid() and m.status = 'active')
  or exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid())
);
create policy "community owner manages channels" on public.community_channels for all to authenticated using (
  exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid())
) with check (
  exists (select 1 from public.communities c where c.id = community_id and c.owner_id = auth.uid())
);

create policy "dm conversations own" on public.dm_conversations for select to authenticated using (
  exists (select 1 from public.dm_members m where m.conversation_id = id and m.user_id = auth.uid())
);
create policy "dm members own" on public.dm_members for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.dm_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);
create policy "create dm conversation" on public.dm_conversations for insert to authenticated with check (true);
create policy "add dm member" on public.dm_members for insert to authenticated with check (user_id = auth.uid() or exists (select 1 from public.dm_members m where m.conversation_id = conversation_id and m.user_id = auth.uid()));
create policy "dm messages readable" on public.dm_messages for select to authenticated using (
  exists (select 1 from public.dm_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);
create policy "send dm message" on public.dm_messages for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.dm_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);

alter publication supabase_realtime add table public.dm_messages;
