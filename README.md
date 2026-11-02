# Hockey Lines

Build and manage hockey lines for your team. The captain drags and drops players into forward (LW/C/RW) and defense (LD/RD) slots. Teammates get a public read-only URL that updates live as the captain makes changes.

## Setup

### 1. Supabase

1. Create a new [Supabase](https://supabase.com) project with **Enable automatic RLS** turned on
2. Run the migrations in the SQL editor, **in order**: paste each file in `supabase/migrations/` (`001_initial_schema.sql`, `002_…`, `003_…`, `004_…`, and any later ones) and run it before the next. See [Database migrations and grants](#database-migrations-and-grants) for why the order matters. Optionally run the read-only checks in `supabase/verification/` afterwards.
3. Enable Realtime on the following tables: Database → Replication → Tables → enable `forward_line_slots`, `defense_line_slots`, `players`, and `game_absences`
4. Set up Google OAuth:
   - In [Google Cloud Console](https://console.cloud.google.com): create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
   - In Supabase: Authentication → Providers → Google → enable it → paste the Client ID and Client Secret
5. Create your team and claim it as owner. Run these in the SQL editor:
   ```sql
   -- Create the team
   insert into teams (name) values ('My Team') returning id;

   -- Find your auth UID after signing in once with Google (Authentication → Users)
   -- Then run:
   update teams set auth_user_id = '<your-auth-uid>' where id = '<team-uuid>';
   insert into system_admins (auth_user_id) values ('<your-auth-uid>');
   ```
   > **Tip:** Sign in via Google first (step 3 of Run Locally below), then come back and run the `update` and `insert` above. Your auth UID appears in Supabase under Authentication → Users.

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 3. Run locally

```bash
npm install
npm run dev
```

1. Open [http://localhost:3000/manage](http://localhost:3000/manage) — you'll be redirected to `/login`
2. Sign in with Google
3. If this is your first login, go back to Supabase and run the `update teams` and `insert into system_admins` SQL from step 1.5 above using your newly created auth UID

Open [http://localhost:3000](http://localhost:3000) for the public view.

## Deploy to Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Add the three environment variables in the Vercel project settings
3. In Supabase: Authentication → URL Configuration → set **Site URL** to your production domain
4. In Google Cloud Console: add your production callback URL as an additional authorized redirect URI: `https://yourdomain.com/auth/callback`

## How it works

- `/` — public live view; shows lines for the next upcoming game; updates in real time via Supabase Realtime
- `/manage` — captain-only editor; drag players from the roster into line slots; requires Google login
- Players can be marked as preferred / acceptable / refused for each position — slots glow green/blue/red during a drag to show compatibility
- Games default to the next upcoming game; up to 4 forward lines and 4 defense pairs per game

## Database migrations and grants

Migrations in `supabase/migrations/` are applied by hand in the Supabase SQL editor (there is no CLI or CI step). Files are numbered and **must be run in numeric order**, each once; never edit an applied file, add a new one. `supabase/verification/` holds read-only checks (they roll back) for the matching migration.

**Rebuild order** (new project, scratch project, or restoring from this repo):

1. Create the project with **Enable automatic RLS** on.
2. Run `001` → `002` → `003` → `004` → anything newer, in that order. `003` replaces policies and the roster view from `001`; `004` sets the grants on every table and view, including the ones `003` touched, so it must come after `003`.
3. Enable Realtime on the tables listed in Setup, then do the Google OAuth and team-claim steps.
4. Run `supabase/verification/003_security_hardening_checks.sql`, `003_players_leagues_owner_writes.sql` and `004_api_grants_checks.sql`; all should report ok / `ALL CHECKS PASSED`.

**Grants are explicit.** Since 2026-10-30 Supabase no longer grants `anon`, `authenticated` or `service_role` any access to new tables, views or sequences in `public`. A query on an object with no grant fails with `42501 permission denied` *before* RLS is looked at. So every migration that creates a table or view in `public` must also:

- `ENABLE ROW LEVEL SECURITY` and add its policies, and
- `GRANT` the least privilege the app needs, per role, in the same migration, e.g.
  ```sql
  grant select on public.things to anon;                       -- only if the public pages read it
  grant select, insert, update on public.things to authenticated;  -- only the operations the app issues
  ```
  Grants decide *whether* a role may try an operation; RLS decides *which rows*. Grant no more than the app uses, and keep it consistent with the policies (a write policy for a role with no matching grant can never run).
- add the object, with its expected privileges, to the table in `supabase/verification/004_api_grants_checks.sql` (it fails on any table or view it does not know about).

`service_role` is intentionally not granted anything: the app has no service-role client. Add a grant for it only together with code that uses it. Sequences need `usage`/`select` grants too if a table ever gets a serial/identity column (all ids are uuid today). Functions are unaffected by the change (EXECUTE still defaults to PUBLIC), but pin `search_path` on `security definer` functions as `003` does.
