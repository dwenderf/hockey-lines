-- Checks for 004_explicit_api_grants.sql. Not a migration (lives outside supabase/migrations).
-- Run in the SQL editor (as postgres) AFTER 001-004. Creates throw-away fixtures inside one
-- transaction and ROLLS EVERYTHING BACK; raises on the first failed expectation and prints
-- 'ALL CHECKS PASSED' otherwise.
--
-- Part 1 compares the exact privilege set of anon and authenticated on every table and view in public
-- with the table in 004 (a table added without a matching grant, or one that is over-granted, fails
-- here). Part 2 replays the app's own queries as anon, as a team owner and as a signed-in non-owner.

begin;

do $$
declare
  expected jsonb := '{
    "teams":              {"anon": "S", "authenticated": "S"},
    "games":              {"anon": "S", "authenticated": "SIU"},
    "forward_line_slots": {"anon": "S", "authenticated": "SIU"},
    "defense_line_slots": {"anon": "S", "authenticated": "SIU"},
    "game_absences":      {"anon": "S", "authenticated": "SID"},
    "rosters":            {"anon": "S", "authenticated": "SIU"},
    "players":            {"anon": "S", "authenticated": "SIUD"},
    "leagues":            {"anon": "S", "authenticated": "SIUD"},
    "system_admins":      {"anon": "",  "authenticated": ""},
    "public_roster_view": {"anon": "S", "authenticated": "S"}
  }';
  r record; role_name text; got text; want text; priv record; n int;
  u_owner uuid := gen_random_uuid();
  u_other uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  p1 uuid := gen_random_uuid();
  p2 uuid := gen_random_uuid();
  g1 uuid := gen_random_uuid();
  ro1 uuid;
begin
  -- ---- Part 1: exact privilege sets ----
  for r in
    select c.relname from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'p')
  loop
    assert expected ? r.relname, 'public.' || r.relname || ' has no row in this check: add it here and grant explicitly in a migration';
  end loop;

  for r in select key as tbl from jsonb_each(expected) loop
    foreach role_name in array array['anon', 'authenticated'] loop
      got := '';
      for priv in
        select letter, p from (values ('S', 'SELECT'), ('I', 'INSERT'), ('U', 'UPDATE'), ('D', 'DELETE'),
                               ('T', 'TRUNCATE'), ('R', 'REFERENCES'), ('G', 'TRIGGER')) as v(letter, p)
      loop
        if has_table_privilege(role_name, 'public.' || r.tbl, priv.p) then got := got || priv.letter; end if;
      end loop;
      want := expected -> r.tbl ->> role_name;
      assert got = want, format('%s on public.%s: has "%s", expected "%s"', role_name, r.tbl, got, want);
    end loop;
  end loop;

  -- ---- Part 2: the app's queries ----
  insert into auth.users (id) values (u_owner), (u_other);
  insert into public.teams (id, name, auth_user_id) values (t1, 'grants T1', u_owner);
  insert into public.players (id, name) values (p1, 'grants p1');
  insert into public.rosters (team_id, player_id) values (t1, p1);
  insert into public.games (id, team_id, opponent, is_home, starts_at) values (g1, t1, 'opp', true, now());
  insert into public.forward_line_slots (game_id, line_number) values (g1, 1);
  insert into public.defense_line_slots (game_id, line_number) values (g1, 1);
  insert into public.game_absences (game_id, player_id) values (g1, p1);

  -- anon: every read the public page does, and no write
  set local role anon;
  perform 1 from public.teams where id = t1;
  perform 1 from public.games where id = g1;
  perform 1 from public.public_roster_view where team_id = t1;
  perform 1 from public.forward_line_slots where game_id = g1 order by line_number;
  perform 1 from public.defense_line_slots where game_id = g1 order by line_number;
  perform 1 from public.game_absences where game_id = g1;
  perform 1 from public.players;
  perform 1 from public.rosters where team_id = t1;
  perform 1 from public.leagues;
  begin perform 1 from public.system_admins; assert false, 'anon must not read system_admins';
  exception when insufficient_privilege then null; end;
  begin insert into public.games (team_id, opponent, is_home, starts_at) values (t1, 'x', true, now()); assert false, 'anon must not insert';
  exception when insufficient_privilege then null; end;
  begin update public.rosters set is_active = false; assert false, 'anon must not update';
  exception when insufficient_privilege then null; end;
  begin delete from public.game_absences; assert false, 'anon must not delete';
  exception when insufficient_privilege then null; end;
  reset role;

  -- team owner: the captain flows
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform 1 from public.teams where auth_user_id = u_owner;
  -- add player: players insert (returning id), then rosters insert, then read the view
  insert into public.players (id, name, is_goalie) values (p2, 'grants p2', false);
  insert into public.rosters (team_id, player_id) values (t1, p2) returning id into ro1;
  perform 1 from public.public_roster_view where team_id = t1;
  -- edit modal / roster actions
  update public.rosters set jersey_number = '9', player_nickname = 'nick', player_level = 3, is_active = false where id = ro1;
  get diagnostics n = row_count; assert n = 1, 'owner must update own roster row';
  update public.rosters set positions = '{"LW":"preferred"}' where id = ro1;
  update public.players set name = 'renamed' where id = p2;
  get diagnostics n = row_count; assert n = 1, 'owner must rename own player';
  -- games and lines
  insert into public.games (team_id, opponent, is_home, starts_at) values (t1, 'opp2', false, now());
  update public.games set is_published = true where id = g1;
  get diagnostics n = row_count; assert n = 1, 'owner must publish own game';
  update public.games set opponent = 'renamed' where id = g1;
  insert into public.forward_line_slots (game_id, line_number) values (g1, 2);
  insert into public.defense_line_slots (game_id, line_number) values (g1, 2);
  update public.forward_line_slots set lw_player_id = p2 where game_id = g1 and line_number = 1;
  get diagnostics n = row_count; assert n = 1, 'owner must assign a forward slot';
  update public.defense_line_slots set ld_player_id = p2 where game_id = g1 and line_number = 1;
  get diagnostics n = row_count; assert n = 1, 'owner must assign a defense slot';
  -- absences
  delete from public.game_absences where game_id = g1 and player_id = p1;
  get diagnostics n = row_count; assert n = 1, 'owner must unmark an absence';
  insert into public.game_absences (game_id, player_id) values (g1, p1);
  -- grants the app does not use stay closed even for the owner
  begin delete from public.games where id = g1; assert false, 'owner has no DELETE grant on games';
  exception when insufficient_privilege then null; end;
  begin delete from public.rosters where id = ro1; assert false, 'owner has no DELETE grant on rosters';
  exception when insufficient_privilege then null; end;
  begin update public.teams set name = 'x' where id = t1; assert false, 'owner has no UPDATE grant on teams';
  exception when insufficient_privilege then null; end;
  begin truncate public.players; assert false, 'authenticated has no TRUNCATE';
  exception when insufficient_privilege then null; end;
  reset role;

  -- signed-in non-owner: grants alone do not let them touch someone else's rows (RLS still decides)
  perform set_config('request.jwt.claims', json_build_object('sub', u_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.games set opponent = 'hijack' where id = g1;
  get diagnostics n = row_count; assert n = 0, 'non-owner must not update another team''s game';
  update public.rosters set is_active = false where team_id = t1;
  get diagnostics n = row_count; assert n = 0, 'non-owner must not update another team''s roster';
  begin insert into public.games (team_id, opponent, is_home, starts_at) values (t1, 'x', true, now()); assert false, 'non-owner must not insert a game for another team';
  exception when insufficient_privilege or check_violation then null; end;
  reset role;

  raise notice 'ALL CHECKS PASSED';
end
$$;

rollback;
