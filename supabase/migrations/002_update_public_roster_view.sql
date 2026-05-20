-- Update public_roster_view to:
--   • add player_id (needed for slot assignment lookups)
--   • add is_goalie, player_level, is_team_admin (so UI can use one view everywhere)
--   • remove WHERE is_active = true filter (app code filters where needed)
-- Must drop first: CREATE OR REPLACE VIEW cannot change existing column order/names.
drop view if exists public_roster_view;
create view public_roster_view as
select
  r.id,
  r.team_id,
  r.player_id,
  r.jersey_number,
  r.player_nickname,
  r.positions,
  r.player_level,
  r.is_team_admin,
  r.is_active,
  p.is_goalie,
  get_display_name(p.name, r.player_nickname, r.jersey_number) as display_name
from rosters r
join players p on p.id = r.player_id;

grant select on public_roster_view to anon;
