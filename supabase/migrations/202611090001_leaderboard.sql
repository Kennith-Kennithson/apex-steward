create extension if not exists pgcrypto;

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  callsign text not null check (char_length(callsign) between 3 and 16),
  callsign_key text generated always as (lower(callsign)) stored,
  player_token_hash text not null unique,
  championship_points integer not null check (championship_points >= 0),
  maximum_points integer not null check (maximum_points > 0 and championship_points <= maximum_points),
  percentage numeric(5,2) not null check (percentage between 0 and 100),
  grade text not null,
  fastest_lap_ms bigint not null check (fastest_lap_ms > 0),
  best_submitted_at timestamptz not null default now(),
  scoring_version text not null default '0.3',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leaderboard_entries_callsign_key_uidx
  on public.leaderboard_entries (callsign_key);

create index if not exists leaderboard_entries_standings_idx
  on public.leaderboard_entries (
    championship_points desc,
    fastest_lap_ms asc,
    best_submitted_at asc
  );

alter table public.leaderboard_entries enable row level security;
revoke all on public.leaderboard_entries from anon, authenticated;
grant select, insert, update, delete on public.leaderboard_entries to service_role;

create or replace function public.submit_leaderboard_result(
  p_callsign text,
  p_player_token_hash text,
  p_championship_points integer,
  p_maximum_points integer,
  p_percentage numeric,
  p_grade text,
  p_fastest_lap_ms bigint,
  p_scoring_version text default '0.3'
)
returns setof public.leaderboard_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.leaderboard_entries;
begin
  if p_callsign !~ '^[A-Za-z0-9_-]{3,16}$'
     or p_championship_points < 0
     or p_maximum_points <= 0
     or p_championship_points > p_maximum_points
     or p_percentage < 0 or p_percentage > 100
     or p_fastest_lap_ms <= 0
     or length(p_grade) > 100 then
    raise exception 'Invalid leaderboard result';
  end if;

  select * into existing
  from public.leaderboard_entries
  where player_token_hash = p_player_token_hash
  for update;

  if found then
    if lower(existing.callsign) <> lower(p_callsign) then
      raise exception 'This browser is already associated with a different callsign';
    end if;

    if p_championship_points > existing.championship_points
       or (p_championship_points = existing.championship_points
           and p_fastest_lap_ms < existing.fastest_lap_ms) then
      update public.leaderboard_entries
      set championship_points = p_championship_points,
          maximum_points = p_maximum_points,
          percentage = p_percentage,
          grade = p_grade,
          fastest_lap_ms = p_fastest_lap_ms,
          best_submitted_at = now(),
          scoring_version = p_scoring_version,
          updated_at = now()
      where id = existing.id;
    end if;

    return query select * from public.leaderboard_entries
      where id = existing.id;
    return;
  end if;

  insert into public.leaderboard_entries (
    callsign, player_token_hash, championship_points, maximum_points,
    percentage, grade, fastest_lap_ms, scoring_version
  ) values (
    p_callsign, p_player_token_hash, p_championship_points, p_maximum_points,
    p_percentage, p_grade, p_fastest_lap_ms, p_scoring_version
  )
  returning * into existing;

  return next existing;
exception
  when unique_violation then
    raise exception 'That callsign is already on the leaderboard';
end;
$$;

revoke all on function public.submit_leaderboard_result(text,text,integer,integer,numeric,text,bigint,text) from public, anon, authenticated;
grant execute on function public.submit_leaderboard_result(text,text,integer,integer,numeric,text,bigint,text) to service_role;
