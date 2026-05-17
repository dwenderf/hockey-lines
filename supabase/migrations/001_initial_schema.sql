-- Teams
create table teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Players
create table players (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  name          text not null,
  is_goalie     bool not null default false,
  positions     jsonb not null default '{}',
  player_level  smallint check (player_level between 1 and 5),
  is_team_admin bool not null default false,
  created_at    timestamptz not null default now()
);

-- Games
create table games (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  opponent   text not null,
  is_home    bool not null,
  starts_at  timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- RLS
alter table teams              enable row level security;
alter table players            enable row level security;
alter table games              enable row level security;
alter table forward_line_slots enable row level security;
alter table defense_line_slots enable row level security;

-- Public read
create policy "public read" on teams              for select using (true);
create policy "public read" on players            for select using (true);
create policy "public read" on games              for select using (true);
create policy "public read" on forward_line_slots for select using (true);
create policy "public read" on defense_line_slots for select using (true);

-- Auth write (captain)
create policy "auth write" on teams              for all using (auth.role() = 'authenticated');
create policy "auth write" on players            for all using (auth.role() = 'authenticated');
create policy "auth write" on games              for all using (auth.role() = 'authenticated');
create policy "auth write" on forward_line_slots for all using (auth.role() = 'authenticated');
create policy "auth write" on defense_line_slots for all using (auth.role() = 'authenticated');

-- Enable Realtime on slot tables (run in Supabase dashboard or via replication settings)
-- alter publication supabase_realtime add table forward_line_slots;
-- alter publication supabase_realtime add table defense_line_slots;
