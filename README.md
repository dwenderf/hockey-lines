# Hockey Lines

Build and manage hockey lines for your team. The captain drags and drops players into forward (LW/C/RW) and defense (LD/RD) slots. Teammates get a public read-only URL that updates live as the captain makes changes.

## Setup

### 1. Supabase

1. Create a new [Supabase](https://supabase.com) project with **Enable automatic RLS** turned on
2. Run the migration in the SQL editor: paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Enable Realtime on the slot tables: Database → Replication → Tables → enable `forward_line_slots` and `defense_line_slots`
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
