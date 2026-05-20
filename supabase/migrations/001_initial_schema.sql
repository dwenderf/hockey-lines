-- Teams
create table teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index teams_auth_user_id_idx on teams(auth_user_id);

-- Players (identity only)
create table players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_goalie  bool not null default false,
  created_at timestamptz not null default now()
);

-- Rosters (team membership + team-specific attributes)
create table rosters (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references teams(id) on delete cascade,
  player_id      uuid not null references players(id) on delete cascade,
  positions      jsonb not null default '{}',
  -- positions shape: { "LW": "preferred"|"acceptable"|"refused", ... }
  player_level    smallint check (player_level between 1 and 5),
  jersey_number   text,
  player_nickname text,
  is_team_admin   bool not null default false,
  is_active       bool not null default true,
  created_at      timestamptz not null default now(),
  unique (team_id, player_id)
);

-- Games
create table games (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams(id) on delete cascade,
  opponent     text not null,
  is_home      bool not null,
  starts_at    timestamptz not null,
  is_published bool not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Forward line slots (LW, C, RW)
create table forward_line_slots (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  line_number   smallint not null check (line_number between 1 and 4),
  lw_player_id  uuid references players(id) on delete set null,
  c_player_id   uuid references players(id) on delete set null,
  rw_player_id  uuid references players(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (game_id, line_number)
);

-- Defense line slots (LD, RD)
create table defense_line_slots (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games(id) on delete cascade,
  line_number   smallint not null check (line_number between 1 and 4),
  ld_player_id  uuid references players(id) on delete set null,
  rd_player_id  uuid references players(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (game_id, line_number)
);

-- Game absences (player out for a single game, not the whole season)
create table game_absences (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references games(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, player_id)
);

-- Leagues (scaffold only — no league_id FK on teams yet, added in v2 when NYCPHA onboards)
create table leagues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- System admins (keyed to auth.users — a system admin may not be a player)
-- Rows inserted manually via SQL editor only; no client write policy.
create table system_admins (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (auth_user_id)
);

-- ============================================================
-- RLS
-- ============================================================

alter table teams              enable row level security;
alter table players            enable row level security;
alter table rosters            enable row level security;
alter table games              enable row level security;
alter table forward_line_slots enable row level security;
alter table defense_line_slots enable row level security;
alter table game_absences      enable row level security;
alter table leagues            enable row level security;
alter table system_admins      enable row level security;

-- Public read
create policy "public read" on teams              for select using (true);
create policy "public read" on players            for select using (true);
create policy "public read" on rosters            for select using (true);
create policy "public read" on games              for select using (true);
create policy "public read" on forward_line_slots for select using (true);
create policy "public read" on defense_line_slots for select using (true);
create policy "public read" on game_absences      for select using (true);
create policy "public read" on leagues            for select using (true);

-- System admin self-read only (no one can see others' system_admin rows)
create policy "self read" on system_admins
  for select using (auth.uid() = auth_user_id);

-- Helper: returns true if the current auth user owns the given team
create or replace function is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from teams
    where id = p_team_id
    and auth_user_id = auth.uid()
  )
$$;

-- Teams: only the owning auth user can write
create policy "owner write" on teams
  for all using (auth.uid() = auth_user_id);

-- Rosters + games: scoped to team owner
create policy "owner write" on rosters
  for all using (is_team_owner(team_id));

create policy "owner write" on games
  for all using (is_team_owner(team_id));

-- Slot tables: check ownership via the parent game's team
create policy "owner write" on forward_line_slots
  for all using (
    exists (
      select 1 from games g
      where g.id = game_id
      and is_team_owner(g.team_id)
    )
  );

create policy "owner write" on defense_line_slots
  for all using (
    exists (
      select 1 from games g
      where g.id = game_id
      and is_team_owner(g.team_id)
    )
  );

create policy "owner write" on game_absences
  for all using (
    exists (
      select 1 from games g
      where g.id = game_id
      and is_team_owner(g.team_id)
    )
  );

-- Players: any authenticated user can write (shared identity across teams; tighten in v2)
create policy "auth write" on players
  for all using (auth.role() = 'authenticated');

-- Leagues: any authenticated user can write (no real league data yet; tighten in v2)
create policy "auth write" on leagues
  for all using (auth.role() = 'authenticated');

-- system_admins: NO client write policy — rows inserted via SQL editor only.

-- ============================================================
-- Display name helper + public roster view
-- ============================================================

create or replace function get_display_name(
  p_name text, p_nickname text, p_jersey text
) returns text language sql immutable as $$
  select case
    when p_nickname is not null and p_nickname <> '' then p_nickname
    else split_part(p_name, ' ', 1) ||
         case when length(split_part(p_name, ' ', 2)) > 0
              then ' ' || left(split_part(p_name, ' ', 2), 1)
              else '' end
  end
$$;

-- Public read-only view used by both the captain view and the public game page.
-- Exposes display_name (resolved nickname or "First L." format) and all fields
-- needed for slot assignment and roster management. No PII — full name only
-- appears already processed inside display_name.
drop view if exists public_roster_view;
create view public_roster_view as
select
  r.id,
  r.team_id,
  r.player_id,
  r.jersey_number,
  r.player_nickname,
  r.positions,
  r.player_level,
  r.is_team_admin,
  r.is_active,
  p.is_goalie,
  get_display_name(p.name, r.player_nickname, r.jersey_number) as display_name
from rosters r
join players p on p.id = r.player_id;

grant select on public_roster_view to anon;

-- ============================================================
-- Enable Realtime on slot tables and players
-- Run in Supabase dashboard: Database → Replication → Tables
-- or uncomment and run:
-- alter publication supabase_realtime add table forward_line_slots;
-- alter publication supabase_realtime add table defense_line_slots;
-- alter publication supabase_realtime add table players;
-- alter publication supabase_realtime add table game_absences;
-- alter publication supabase_realtime add table rosters;
-- ============================================================

-- ============================================================
-- Post-migration setup (run once, substituting your values)
-- ============================================================
--
-- 1. Find your auth UID: Supabase dashboard → Authentication → Users → copy your UUID
--
-- 2. Claim your team:
--    update teams
--    set auth_user_id = '<your-auth-uid>'
--    where id = '<your-NEXT_PUBLIC_TEAM_ID>';
--
-- 3. Grant yourself system admin:
--    insert into system_admins (auth_user_id)
--    values ('<your-auth-uid>');
