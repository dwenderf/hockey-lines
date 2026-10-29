-- Behavioural check for the players/leagues policies in 003_security_hardening.sql.
-- Run in the Supabase SQL editor (as postgres) AFTER the migration. It creates throw-away fixtures
-- (two auth users, two teams, players, a league) inside one transaction and ROLLS EVERYTHING BACK,
-- so it leaves nothing behind. It raises an exception on the first failed expectation and prints
-- 'ALL CHECKS PASSED' otherwise.
--
-- Expectations: reads unchanged for anon and authenticated; a team owner can insert, and can update
-- or delete players on their own roster and leagues; a signed-in non-owner can do none of it; a
-- team owner cannot touch a player who is only on another team, and cannot delete a player who is
-- also on someone else's team (that delete would cascade into the other team's roster).

begin;

do $$
declare
  u_owner1 uuid := gen_random_uuid();
  u_owner2 uuid := gen_random_uuid();
  u_other  uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  p_only1  uuid := gen_random_uuid();  -- on team 1 only
  p_shared uuid := gen_random_uuid();  -- on team 1 and team 2
  p_orphan uuid := gen_random_uuid();  -- on no roster
  l1 uuid := gen_random_uuid();
  n_players int; n_leagues int; n int;
begin
  insert into auth.users (id) values (u_owner1), (u_owner2), (u_other);
  insert into public.teams (id, name, auth_user_id) values (t1, 'verify T1', u_owner1), (t2, 'verify T2', u_owner2);
  insert into public.players (id, name) values (p_only1, 'verify only T1'), (p_shared, 'verify shared'), (p_orphan, 'verify orphan');
  insert into public.rosters (team_id, player_id) values (t1, p_only1), (t1, p_shared), (t2, p_shared);
  insert into public.leagues (id, name) values (l1, 'verify league');
  select count(*) into n_players from public.players;
  select count(*) into n_leagues from public.leagues;

  -- reads are unchanged: anon and a non-owner both see every row
  set local role anon;
  select count(*) into n from public.players;  assert n = n_players, 'anon must read all players';
  select count(*) into n from public.leagues;  assert n = n_leagues, 'anon must read all leagues';
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', u_other, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.players;  assert n = n_players, 'non-owner must read all players';
  select count(*) into n from public.leagues;  assert n = n_leagues, 'non-owner must read all leagues';

  -- non-owner: no writes
  update public.players set name = 'x';   get diagnostics n = row_count; assert n = 0, 'non-owner must not update players';
  delete from public.players;             get diagnostics n = row_count; assert n = 0, 'non-owner must not delete players';
  update public.leagues set name = 'x';   get diagnostics n = row_count; assert n = 0, 'non-owner must not update leagues';
  delete from public.leagues;             get diagnostics n = row_count; assert n = 0, 'non-owner must not delete leagues';
  begin
    insert into public.players (name) values ('x'); assert false, 'non-owner must not insert players';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.leagues (name) values ('x'); assert false, 'non-owner must not insert leagues';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- team 2 owner: not on p_only1, so cannot edit or delete it
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.players set name = 'x' where id = p_only1;  get diagnostics n = row_count; assert n = 0, 'owner 2 must not update a player on another team only';
  delete from public.players where id = p_only1;            get diagnostics n = row_count; assert n = 0, 'owner 2 must not delete a player on another team only';
  reset role;

  -- team 1 owner: the app's own edit paths
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.players (name, is_goalie) values ('verify new', false);                       -- "add player" step 1
  update public.players set name = 'renamed' where id = p_only1;                                    -- rename from the edit modal
  get diagnostics n = row_count; assert n = 1, 'owner must update own player';
  update public.players set name = 'renamed shared' where id = p_shared;                            -- shared player on own team
  get diagnostics n = row_count; assert n = 1, 'owner must update a shared player on own roster';
  delete from public.players where id = p_shared;                                                   -- would cascade into team 2's roster
  get diagnostics n = row_count; assert n = 0, 'owner must not delete a player who is also on another team';
  delete from public.players where id = p_only1;
  get diagnostics n = row_count; assert n = 1, 'owner must delete a player on own team only';
  delete from public.players where id = p_orphan;
  get diagnostics n = row_count; assert n = 1, 'owner must delete a player on no roster';
  insert into public.leagues (name) values ('verify league 2');
  update public.leagues set name = 'y' where id = l1;      get diagnostics n = row_count; assert n = 1, 'owner must update leagues';
  delete from public.leagues where id = l1;                get diagnostics n = row_count; assert n = 1, 'owner must delete leagues';
  reset role;

  raise notice 'ALL CHECKS PASSED';
end
$$;

rollback;
