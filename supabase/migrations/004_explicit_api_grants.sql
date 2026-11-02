-- =============================================================
-- Explicit Data API grants for every table and view in public
-- =============================================================
-- Why: from 2026-10-30 Supabase stops auto-granting SELECT/INSERT/UPDATE/DELETE on new public tables,
-- views and sequences to anon, authenticated and service_role (a missing grant fails with 42501 before
-- RLS is even looked at). 001 never granted anything: it relied on those automatic grants. 003 added
-- grants for rosters, players and public_roster_view only. This migration states the grants for the
-- rest, so that (a) a rebuild from supabase/migrations/ gives a working app on a project without the
-- automatic grants, and (b) the live project ends up with exactly the access the app uses, no more.
--
-- Basis: audit of all 53 supabase.from(...) calls in src/ (there is no service-role client, no .rpc(),
-- no upsert), plus the Realtime subscriptions (postgres_changes needs SELECT for the subscribing role).
-- Writes stay behind the RLS policies from 001/003: a grant only lets the role *try*; the policy
-- decides which rows. A privilege is granted only when the app issues that operation, or when an
-- explicit policy from 003 authorises it (players and leagues: owner insert/update/delete).
--
--   table               anon     authenticated            used by the app
--   teams               S        S                        read team name / captain check
--   games               S        S I U                    create, edit, publish/unpublish game
--   forward_line_slots  S        S I U                    read lines, assign players, add a line
--   defense_line_slots  S        S I U                    same
--   game_absences       S        S I D                    mark absent / present
--   rosters             S        S I U                    add to roster, edit, deactivate/reactivate
--   players             S        S I U D                  add and rename; D is for the 003 owner-delete policy
--   leagues             S        S I U D                  unused by the app; 003 owner policies, public read
--   system_admins       -        -                        unused by the app (SQL-editor-managed)
--   public_roster_view  S        S                        roster reads (security_invoker, see 003)
--
-- No sequences exist (every id is a uuid), so there is nothing to grant on sequences.
-- service_role is not touched: the app never uses it. If server-side code with the service-role key is
-- ever added, grant it explicitly in a new migration.
-- Functions are not affected by the 2026-10-30 change (EXECUTE still defaults to PUBLIC); is_team_owner
-- and get_display_name keep working as they do today.
--
-- Idempotent and safe to re-run: every statement is a REVOKE/GRANT/ALTER DEFAULT PRIVILEGES.
-- Never edit this file once applied; add a new migration instead.
-- Not applied by the PR that adds it: run it by hand in the SQL editor, after 001-003.
--


-- -------------------------------------------------------------
-- 1. Default privileges: new objects in public are not exposed automatically
-- -------------------------------------------------------------
-- These are the same two statements Supabase documents for opting out of auto-exposure (and what the
-- 2026-10-30 change does to existing projects, so on the hosted project they are no-ops once the
-- platform switch has happened). They make a scratch or older project behave like the new regime, so a
-- table that forgot its GRANT fails in development, not first in production.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;


-- -------------------------------------------------------------
-- 2. Reset anon and authenticated on the app's tables, then grant exactly what is needed
-- -------------------------------------------------------------
-- The REVOKE also removes what the old automatic grants left on existing tables (all of INSERT, UPDATE,
-- DELETE, TRUNCATE, REFERENCES, TRIGGER for anon and authenticated). TRUNCATE bypasses RLS, and anon
-- never needed any write, so on the live project this is a tightening; the app's own paths are
-- re-granted below. service_role is deliberately left alone.
revoke all on table
  public.teams,
  public.games,
  public.forward_line_slots,
  public.defense_line_slots,
  public.game_absences,
  public.rosters,
  public.players,
  public.leagues,
  public.system_admins,
  public.public_roster_view
from anon, authenticated;

-- Public (anon) reads: the public game page and the captain pages both read these. Every one of them
-- has a "public read" policy (for select using (true)), and Realtime on the slot, absence and player
-- tables needs SELECT for the subscribing role. anon gets SELECT and nothing else.
grant select on table
  public.teams,
  public.games,
  public.forward_line_slots,
  public.defense_line_slots,
  public.game_absences,
  public.rosters,
  public.players,
  public.leagues,
  public.public_roster_view
to anon;

-- Signed-in users (team owners): the same reads (also needed by the policies' sub-selects on teams,
-- games, rosters and the slot tables, and by UPDATE ... WHERE and INSERT ... RETURNING), plus the
-- writes the app issues. RLS ("owner write" on rosters/games/slots/absences, owner policies on
-- players/leagues) still limits them to the owner's own rows.
grant select on table
  public.teams,
  public.games,
  public.forward_line_slots,
  public.defense_line_slots,
  public.game_absences,
  public.rosters,
  public.players,
  public.leagues,
  public.public_roster_view
to authenticated;

grant insert, update on table public.games              to authenticated;  -- GameFormModal, useGames, publish toggle
grant insert, update on table public.forward_line_slots to authenticated;  -- new game seeds slots; assign players; add line
grant insert, update on table public.defense_line_slots to authenticated;
grant insert, delete on table public.game_absences      to authenticated;  -- useGameAbsences (mark / unmark absent)
grant insert, update on table public.rosters            to authenticated;  -- add to roster, edit, is_active toggle (no delete: soft)
grant insert, update, delete on table public.players    to authenticated;  -- add, rename; delete per the 003 "owner delete" policy
grant insert, update, delete on table public.leagues    to authenticated;  -- no app use yet; matches the 003 owner policies

-- teams has no client write path: teams are created and claimed in the SQL editor (README), and the
-- app only reads them. system_admins is only ever written and read from the SQL editor. Neither gets
-- any grant above, so the "owner write" policy on teams and the "self read" policy on system_admins
-- are unreachable from the Data API until a future migration grants the matching privilege.
