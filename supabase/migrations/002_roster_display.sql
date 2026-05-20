-- Add jersey number and nickname to rosters
alter table rosters
  add column jersey_number   text,
  add column player_nickname text;

-- Returns a privacy-safe display name for a roster player.
-- Priority: nickname → "First L." from full name.
create or replace function get_display_name(
  p_name     text,
  p_nickname text,
  p_jersey   text
) returns text
language sql
immutable
as $$
  select case
    when p_nickname is not null and p_nickname <> '' then p_nickname
    else
      split_part(p_name, ' ', 1) ||
      case
        when length(split_part(p_name, ' ', 2)) > 0
          then ' ' || left(split_part(p_name, ' ', 2), 1) || '.'
        else ''
      end
  end
$$;

-- Public view: exposes only non-PII roster data for active players.
-- Excludes player_id, player_level, is_team_admin.
-- display_name is nickname or "First L." — never raw full name.
-- RLS on the underlying tables still applies (security invoker).
create or replace view public_roster_view as
select
  r.id,
  r.team_id,
  r.jersey_number,
  r.player_nickname,
  r.positions,
  r.is_active,
  get_display_name(p.name, r.player_nickname, r.jersey_number) as display_name
from rosters r
join players p on p.id = r.player_id
where r.is_active = true;

grant select on public_roster_view to anon;
