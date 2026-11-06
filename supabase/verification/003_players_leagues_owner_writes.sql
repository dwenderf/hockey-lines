-- Behavioural check for the players/leagues policies in 003_security_hardening.sql.
-- Run in the Supabase SQL editor (as postgres) AFTER the migration. It creates throw-away fixtures
-- (two auth users, two teams, players, a league) inside one transaction and ROLLS EVERYTHING BACK,
-- so it leaves nothing behind. It raises an exception on the first failed expectation and prints
-- 'ALL CHECKS PASSED' otherwise.
--
-- Expectations: reads unchanged for anon and authenticated; a team owner can insert, and can update
-- or delete players on their own roster and leagues; a signed-in non-owner can do none of it; a
-- team owner cannot touch a player who is only on another team, and cannot delete a player who is
-- also on someone else's team (that delete would cascade into the other team's roster). It also
-- covers the other foreign keys into players, whose cascades / SET NULLs bypass RLS: a team owner
-- cannot delete a player who appears in an absence or a lineup slot of another team's game, even a
-- past game of a team the player has left, but can delete a player whose only such rows are in their
-- own games (those rows are then removed / nulled).

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
  g1 uuid := gen_random_uuid();        -- a game of team 1
  g2 uuid := gen_random_uuid();        -- a game of team 2
  p_f_lw uuid := gen_random_uuid();    -- on team 1 only, but in a team 2 forward slot as LW
  p_f_c  uuid := gen_random_uuid();    --   ... as C
  p_f_rw uuid := gen_random_uuid();    --   ... as RW
  p_d_ld uuid := gen_random_uuid();    --   ... in a team 2 defense slot as LD
  p_d_rd uuid := gen_random_uuid();    --   ... as RD
  p_abs  uuid := gen_random_uuid();    --   ... absent from a team 2 game
  p_own  uuid := gen_random_uuid();    -- on team 1 only, in team 1's own slots and absence
  n_players int; n_leagues int; n int; fk_cols text;
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

  -- every foreign key into players is accounted for by the delete policy (this fails if a new FK to
  -- players is added without extending the "owner delete" policy and this file)
  select string_agg(c.conrelid::regclass::text || '.' || a.attname, ', ' order by c.conrelid::regclass::text, a.attname)
    into fk_cols
  from pg_constraint c
  join lateral unnest(c.conkey) as k(attnum) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.contype = 'f' and c.confrelid = 'public.players'::regclass;
  assert fk_cols = 'defense_line_slots.ld_player_id, defense_line_slots.rd_player_id, forward_line_slots.c_player_id, forward_line_slots.lw_player_id, forward_line_slots.rw_player_id, game_absences.player_id, rosters.player_id',
    'foreign keys into players changed: ' || fk_cols;

  -- other-team history: a player who is on team 1 only (not on team 2's roster) but appears in team 2's
  -- past games must not be deletable by team 1's owner, for each referencing column
  insert into public.players (id, name) values
    (p_f_lw, 'verify f lw'), (p_f_c, 'verify f c'), (p_f_rw, 'verify f rw'),
    (p_d_ld, 'verify d ld'), (p_d_rd, 'verify d rd'), (p_abs, 'verify absent'), (p_own, 'verify own history');
  insert into public.rosters (team_id, player_id)
    values (t1, p_f_lw), (t1, p_f_c), (t1, p_f_rw), (t1, p_d_ld), (t1, p_d_rd), (t1, p_abs), (t1, p_own);
  insert into public.games (id, team_id, opponent, is_home, starts_at)
    values (g1, t1, 'verify opp', true, now()), (g2, t2, 'verify opp', true, now());
  insert into public.forward_line_slots (game_id, line_number, lw_player_id, c_player_id, rw_player_id) values
    (g2, 1, p_f_lw, null, null), (g2, 2, null, p_f_c, null), (g2, 3, null, null, p_f_rw),
    (g1, 1, p_own, null, null);
  insert into public.defense_line_slots (game_id, line_number, ld_player_id, rd_player_id) values
    (g2, 1, p_d_ld, null), (g2, 2, null, p_d_rd), (g1, 1, null, p_own);
  insert into public.game_absences (game_id, player_id) values (g2, p_abs), (g1, p_own);

  perform set_config('request.jwt.claims', json_build_object('sub', u_owner1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.players where id = p_f_lw;  get diagnostics n = row_count; assert n = 0, 'owner 1 must not delete a player in another team''s forward slot (lw)';
  delete from public.players where id = p_f_c;   get diagnostics n = row_count; assert n = 0, 'owner 1 must not delete a player in another team''s forward slot (c)';
  delete from public.players where id = p_f_rw;  get diagnostics n = row_count; assert n = 0, 'owner 1 must not delete a player in another team''s forward slot (rw)';
  delete from public.players where id = p_d_ld;  get diagnostics n = row_count; assert n = 0, 'owner 1 must not delete a player in another team''s defense slot (ld)';
  delete from public.players where id = p_d_rd;  get diagnostics n = row_count; assert n = 0, 'owner 1 must not delete a player in another team''s defense slot (rd)';
  delete from public.players where id = p_abs;   get diagnostics n = row_count; assert n = 0, 'owner 1 must not delete a player with an absence in another team''s game';
  reset role;
  -- and team 2's history is intact
  select count(*) into n from public.forward_line_slots
    where game_id = g2 and (lw_player_id = p_f_lw or c_player_id = p_f_c or rw_player_id = p_f_rw);
  assert n = 3, 'team 2 forward slots must be intact';
  select count(*) into n from public.defense_line_slots
    where game_id = g2 and (ld_player_id = p_d_ld or rd_player_id = p_d_rd);
  assert n = 2, 'team 2 defense slots must be intact';
  select count(*) into n from public.game_absences where game_id = g2 and player_id = p_abs;
  assert n = 1, 'team 2 absence must be intact';

  -- a player whose slots and absence are all in the owner's own games can still be deleted; the
  -- owner's own slots are nulled and the absence removed by the foreign keys
  set local role authenticated;
  delete from public.players where id = p_own;   get diagnostics n = row_count; assert n = 1, 'owner 1 must delete a player whose history is only in own games';
  reset role;
  select count(*) into n from public.game_absences where player_id = p_own;  assert n = 0, 'own absence must be removed with the player';
  select count(*) into n from public.forward_line_slots where game_id = g1 and lw_player_id is null;  assert n = 1, 'own forward slot must be emptied';

  -- once team 2's history no longer references the player, the delete goes through
  delete from public.forward_line_slots where game_id = g2 and lw_player_id = p_f_lw;
  set local role authenticated;
  delete from public.players where id = p_f_lw;  get diagnostics n = row_count; assert n = 1, 'owner 1 must delete the player once no other team references it';
  reset role;

  raise notice 'ALL CHECKS PASSED';
end
$$;

rollback;
