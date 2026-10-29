-- Read-only checks for 003_security_hardening.sql. Not a migration (lives outside supabase/migrations).
-- Run in the SQL editor after the migration is applied; every row should show ok = true.

select 'is_team_owner is security definer with pinned search_path' as check,
       (p.prosecdef and p.proconfig @> array['search_path=""']) as ok
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname = 'is_team_owner';

select 'public_roster_view is security_invoker' as check,
       coalesce(c.reloptions @> array['security_invoker=true'], false) as ok
from pg_class c
where c.oid = 'public.public_roster_view'::regclass;

select 'anon can still read what the roster view needs (' || t || ')' as check,
       has_table_privilege('anon', 'public.' || t, 'select') as ok
from unnest(array['rosters', 'players', 'public_roster_view']) as t;

select 'anon read policies still present on rosters and players' as check,
       count(*) = 2 as ok
from pg_policies
where schemaname = 'public' and tablename in ('rosters', 'players')
  and policyname = 'public read' and cmd = 'SELECT' and qual = 'true';

select 'rls_auto_enable exists, security definer, search_path = pg_catalog' as check,
       (p.prosecdef and p.proconfig @> array['search_path=pg_catalog']) as ok
from pg_proc p
where p.pronamespace = 'public'::regnamespace and p.proname = 'rls_auto_enable';

select 'ensure_rls event trigger runs rls_auto_enable on ddl_command_end' as check,
       exists (
         select 1 from pg_event_trigger e
         where e.evtname = 'ensure_rls' and e.evtevent = 'ddl_command_end'
           and e.evtfoid = 'public.rls_auto_enable()'::regprocedure
       ) as ok;

-- Functional check of the roster view as anon (rolls back; changes nothing). Expect a count, not an error.
begin;
set local role anon;
select 'anon can query public_roster_view' as check, count(*) >= 0 as ok from public.public_roster_view;
rollback;
