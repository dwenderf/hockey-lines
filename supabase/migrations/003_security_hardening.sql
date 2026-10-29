-- =============================================================
-- Security hardening
--   1. is_team_owner: pin search_path (SECURITY DEFINER function without one)
--   2. public_roster_view: run with the caller's privileges (security_invoker)
--   3. rls_auto_enable / ensure_rls: bring the Supabase-provisioned drift under version control
-- =============================================================
-- Idempotent: create or replace, alter view ... set, and guarded creates are safe to re-run.
-- Never edit this file once applied; add a new migration instead.
--
-- Deliberately NOT changed here: the "auth write" ALL policies on players and leagues
-- (any signed-in user can insert, update and delete every player and league). That is a product
-- decision for David; see the PR description.


-- -------------------------------------------------------------
-- 1. is_team_owner: pin search_path
-- -------------------------------------------------------------
-- Same signature, language, volatility and result as 001_initial_schema.sql. The body is unchanged
-- apart from schema-qualifying `teams`, because search_path = '' means unqualified names no longer
-- resolve. auth.uid() was already qualified.
--
-- EXECUTE grants are deliberately left as they are (this change does not touch them). The "owner
-- write" policies on rosters, games and the slot/absence tables call this function, and
-- authenticated owners need EXECUTE on it for writes. Whether anon still needs it is a separate,
-- optional tightening: anon reads currently work without it only because Postgres folds
-- `is_team_owner(...) OR true` (the "public read" policy) to `true` at plan time.
create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.teams
    where id = p_team_id
    and auth_user_id = auth.uid()
  )
$$;


-- -------------------------------------------------------------
-- 2. public_roster_view: security_invoker
-- -------------------------------------------------------------
-- A view runs with its owner's privileges by default, which bypasses RLS on the tables underneath.
-- With security_invoker the caller's own privileges and the policies on rosters and players apply.
--
-- Safe for the anonymous roster page because both underlying tables already allow anon to read
-- every row: the "public read" policy on rosters and on players is `for select using (true)` (no
-- role restriction), and anon holds SELECT on both tables. get_display_name() is PUBLIC-executable.
-- The grants below are what the view now depends on, stated explicitly so a future revoke of
-- Supabase's default table grants cannot silently empty the public roster; they are no-ops today.
grant select on public.rosters to anon, authenticated;
grant select on public.players to anon, authenticated;

alter view public.public_roster_view set (security_invoker = true);

grant select on public.public_roster_view to anon, authenticated;


-- -------------------------------------------------------------
-- 3. rls_auto_enable() and the ensure_rls event trigger
-- -------------------------------------------------------------
-- Supabase's "automatically enable RLS" option created these on the hosted project; no migration
-- created them, so a database rebuilt from this repo would lack them. This is the live definition
-- (checked 2026-10-29: the function body's md5 matches the live pg_proc.prosrc, owner postgres,
-- SECURITY DEFINER, search_path = pg_catalog), copied verbatim so applying it to the live database
-- changes nothing.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- Event triggers have no CREATE OR REPLACE and need a superuser. It already exists on the hosted
-- project (so this is skipped there); on a fresh database it is created when the migration role
-- may, and otherwise skipped with a notice rather than failing the migration.
do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    begin
      create event trigger ensure_rls on ddl_command_end
        execute function public.rls_auto_enable();
    exception
      when insufficient_privilege then
        raise notice 'ensure_rls not created: creating an event trigger needs a superuser';
    end;
  end if;
end
$$;
