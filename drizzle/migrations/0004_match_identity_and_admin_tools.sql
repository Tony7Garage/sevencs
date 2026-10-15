-- Seven CS V3.2: Steam identity, manual match KD and admin multiplier tools

alter table public.profiles
  add column if not exists steam_name text;

create index if not exists idx_profiles_steam_name on public.profiles(steam_name);

alter table public.matches
  add column if not exists submitted_kd numeric(6,2);

-- Re-apply the review columns defensively so environments where 0002 was not
-- executed yet do not fail when the application writes pending matches.
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

create index if not exists idx_matches_status on public.matches(status);
