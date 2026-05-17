# Hockey Lines

Build and manage hockey lines for your team. The captain drags and drops players into forward (LW/C/RW) and defense (LD/RD) slots. Teammates get a public read-only URL that updates live as the captain makes changes.

## Setup

### 1. Supabase

1. Create a new [Supabase](https://supabase.com) project
2. Run the migration in the SQL editor: paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Enable Realtime on the slot tables: Database → Replication → Tables → enable `forward_line_slots` and `defense_line_slots`
4. Enable Google OAuth: Authentication → Providers → Google → add your Google Cloud Console credentials
   - Set the callback URL in Google Cloud Console to: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Insert a row into the `teams` table and note its UUID:
   ```sql
   insert into teams (name) values ('My Team') returning id;
   ```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_TEAM_ID=<uuid from teams table>
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — public view.
Open [http://localhost:3000/manage](http://localhost:3000/manage) — captain editor (requires Google login).

## Deploy to Vercel

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Add the three environment variables in the Vercel project settings
3. Set the Google OAuth callback URL in Supabase to your production domain: `https://yourdomain.com/auth/callback`

## How it works

- `/` — public live view; shows lines for the next upcoming game; updates in real time via Supabase Realtime
- `/manage` — captain-only editor; drag players from the roster into line slots; requires Google login
- Players can be marked as preferred / acceptable / refused for each position — slots glow green/blue/red during a drag to show compatibility
- Games default to the next upcoming game; up to 4 forward lines and 4 defense pairs per game
