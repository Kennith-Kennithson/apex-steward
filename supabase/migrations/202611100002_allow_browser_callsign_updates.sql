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
  violated_constraint text;
  is_better_result boolean;
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
    is_better_result :=
      p_championship_points > existing.championship_points
      or (p_championship_points = existing.championship_points
          and p_fastest_lap_ms < existing.fastest_lap_ms);

    -- A browser keeps one leaderboard entry, but may use a newly generated
    -- callsign on a later quiz. The existing best result is retained.
    if lower(existing.callsign) <> lower(p_callsign) then
      update public.leaderboard_entries
      set callsign = p_callsign,
          updated_at = now()
      where id = existing.id
      returning * into existing;
    end if;

    if is_better_result then
      update public.leaderboard_entries
      set championship_points = p_championship_points,
          maximum_points = p_maximum_points,
          percentage = p_percentage,
          grade = p_grade,
          fastest_lap_ms = p_fastest_lap_ms,
          best_submitted_at = now(),
          scoring_version = p_scoring_version,
          updated_at = now()
      where id = existing.id
      returning * into existing;
    end if;

    return next existing;
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
    get stacked diagnostics violated_constraint = constraint_name;

    if violated_constraint = 'leaderboard_entries_callsign_key_uidx' then
      raise exception 'That callsign is already on the leaderboard';
    elsif violated_constraint = 'leaderboard_entries_player_token_hash_key' then
      raise exception 'This browser is already associated with a different callsign';
    else
      raise exception 'Leaderboard result could not be saved because of a database uniqueness conflict';
    end if;
end;
$$;

revoke all on function public.submit_leaderboard_result(text,text,integer,integer,numeric,text,bigint,text) from public, anon, authenticated;
grant execute on function public.submit_leaderboard_result(text,text,integer,integer,numeric,text,bigint,text) to service_role;
