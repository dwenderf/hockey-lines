<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:supabase-grants-rules -->
# Supabase migrations: explicit grants

- Migrations in `supabase/migrations/` are applied by hand, in numeric order. Never edit an applied file; add a new one. Rebuild order and details: README, "Database migrations and grants".
- Supabase no longer auto-grants access on new `public` tables, views or sequences (from 2026-10-30). Every migration that creates one **must** in the same file: `ENABLE ROW LEVEL SECURITY`, add policies, and `GRANT` the least privilege per role (`anon`, `authenticated`) that the app's `.from()` calls actually need. A missing grant fails with `42501` before RLS runs.
- Keep grants and policies consistent: do not grant a write privilege that no policy allows, and do not add a write policy without the matching grant.
- Do not grant to `service_role` unless the code uses it. Do not use `grant all`.
- Update the expected-privilege table in `supabase/verification/004_api_grants_checks.sql` when adding or changing grants (it fails on unknown tables), and run it against a local Postgres rebuilt from all migrations before opening the PR.
- Never apply migrations to the live project from an agent or CI; open a PR and let David run them.
<!-- END:supabase-grants-rules -->
