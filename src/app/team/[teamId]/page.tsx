'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useIsTeamCaptain } from '@/hooks/useIsTeamCaptain';
import { AddGameForm } from '@/components/games/AddGameForm';
import { formatOpponent } from '@/lib/formatOpponent';
import type { Game, Team } from '@/lib/types';

// ── Date / time helpers ────────────────────────────────────────────────────

function formatGameDate(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (hours >= 24) return `${days}d ${remHours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function classifyGame(game: Game, now: number): 'upcoming' | 'in-progress' | 'past' {
  const startsAt = new Date(game.starts_at).getTime();
  if (now < startsAt) return 'upcoming';
  if (now < startsAt + TWO_HOURS_MS) return 'in-progress';
  return 'past';
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9H21" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 7V12L15 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StatusPill({ isPublished }: { isPublished: boolean }) {
  if (isPublished) {
    return (
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: 'var(--pill-published-bg)', color: 'var(--pill-published-text)' }}
      >
        Published
      </span>
    );
  }
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'var(--bench)', color: 'var(--text-secondary)' }}
    >
      Draft
    </span>
  );
}

function ZeroGamesState({ isCaptain, onAddGame }: { isCaptain: boolean; onAddGame: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span style={{ color: 'var(--text-secondary)' }}><CalendarIcon /></span>
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No games scheduled yet</p>
      {isCaptain ? (
        <>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Get started by adding your first game.</p>
          <button
            onClick={onAddGame}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          >
            Add game
          </button>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Check back soon — your captain will add games here.
        </p>
      )}
    </div>
  );
}

function NextGameCard({
  game,
  teamId,
  isCaptain,
  now,
  onAddGame,
}: {
  game: Game | null;
  teamId: string;
  isCaptain: boolean;
  now: number;
  onAddGame: () => void;
}) {
  if (!game) {
    return (
      <div
        className="rounded-lg p-4 border"
        style={{ backgroundColor: 'var(--next-game-bg)', borderColor: 'var(--accent)' }}
      >
        <p
          className="text-xs uppercase font-bold tracking-wider mb-3"
          style={{ color: 'var(--accent)' }}
        >
          NEXT GAME
        </p>
        <div className="flex flex-col items-center py-4 gap-2" style={{ color: 'var(--text-secondary)' }}>
          <CalendarIcon />
          <p className="text-sm">No upcoming games scheduled</p>
          {isCaptain && (
            <button
              onClick={onAddGame}
              className="text-xs mt-1"
              style={{ color: 'var(--accent)' }}
            >
              Add game →
            </button>
          )}
        </div>
      </div>
    );
  }

  const startsAt = new Date(game.starts_at).getTime();
  const msRemaining = startsAt - now;
  const classification = classifyGame(game, now);

  const countdownDisplay = classification === 'in-progress'
    ? 'Game in progress'
    : formatCountdown(msRemaining);

  return (
    <div
      className="rounded-lg p-4 border"
      style={{ backgroundColor: 'var(--next-game-bg)', borderColor: 'var(--accent)' }}
    >
      <p
        className="text-xs uppercase font-bold tracking-wider mb-1"
        style={{ color: 'var(--accent)' }}
      >
        NEXT GAME
      </p>
      <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {formatOpponent(game.opponent, game.is_home)}
      </h2>
      <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {formatGameDate(game.starts_at)}
      </p>
      <p className="font-display text-xl font-bold mt-2" style={{ color: 'var(--accent)' }}>
        {countdownDisplay}
      </p>
      <div className="flex items-center justify-between mt-3">
        <Link
          href={`/team/${teamId}/game/${game.id}`}
          className="text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          View lines →
        </Link>
        {isCaptain && (
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: game.is_published ? 'var(--pill-published-text)' : 'var(--text-secondary)' }}
          >
            {game.is_published ? '✓ Published' : '· Draft'}
          </span>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  teamId,
  isCaptain,
}: {
  game: Game;
  teamId: string;
  isCaptain: boolean;
}) {
  return (
    <Link
      href={`/team/${teamId}/game/${game.id}`}
      className="block rounded-lg p-3 border"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        textDecoration: 'none',
      }}
    >
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {formatGameDate(game.starts_at)}
      </p>
      <p className="font-display text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
        {formatOpponent(game.opponent, game.is_home)}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div>{isCaptain && <StatusPill isPublished={game.is_published} />}</div>
        <span style={{ color: 'var(--text-secondary)' }}>
          <ChevronRightIcon />
        </span>
      </div>
    </Link>
  );
}

function EmptyListState({
  filter,
  isCaptain,
}: {
  filter: 'upcoming' | 'past';
  isCaptain: boolean;
}) {
  if (filter === 'upcoming') {
    return (
      <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-secondary)' }}>
        <CalendarIcon />
        <div>
          <p className="text-sm">No other games scheduled</p>
          {isCaptain && (
            <p className="text-xs mt-0.5">Add a game below ↓</p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-secondary)' }}>
      <ClockIcon />
      <p className="text-sm">No games played yet</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TeamHubPage() {
  const { teamId } = useParams<{ teamId: string }>();

  // Captain status — single source of truth via shared hook
  const { isCaptain, loading: captainLoading } = useIsTeamCaptain(teamId);

  const [team, setTeam]               = useState<Team | null>(null);
  const [captainTeams, setCaptainTeams] = useState<Team[]>([]);
  const [games, setGames]             = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [now, setNow]                 = useState(Date.now());
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [showAddGame, setShowAddGame] = useState(false);

  // Show the page only once both games and the captain check have resolved
  const loading = gamesLoading || captainLoading;

  const supabaseRef = useRef(createClient());

  const fetchGames = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from('games')
      .select('*')
      .eq('team_id', teamId)
      .order('starts_at', { ascending: true });
    if (data) setGames(data);
  }, [teamId]);

  // Fetch team name + games; set up Realtime subscription
  useEffect(() => {
    const supabase = supabaseRef.current;

    const init = async () => {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .single();

      if (teamData) setTeam({ id: teamData.id, name: teamData.name });

      await fetchGames();
      setGamesLoading(false);
    };

    init().catch(() => setGamesLoading(false));

    const channel = supabase
      .channel(`games:${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `team_id=eq.${teamId}` },
        () => { fetchGames(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, fetchGames]);

  // Fetch captain's full team list for the tab strip (only when confirmed captain)
  useEffect(() => {
    if (!isCaptain) { setCaptainTeams([]); return; }
    const supabase = createClient();
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myTeams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .order('name');
      setCaptainTeams(myTeams ?? []);
    };
    fetch().catch(() => {});
  }, [isCaptain]);

  // Countdown — ticks every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const addGame = useCallback(async (opponent: string, isHome: boolean, startsAt: string) => {
    const supabase = supabaseRef.current;
    const { data: game } = await supabase
      .from('games')
      .insert({ team_id: teamId, opponent, is_home: isHome, starts_at: startsAt })
      .select()
      .single();
    if (game) {
      await supabase.from('forward_line_slots').insert([
        { game_id: game.id, line_number: 1 },
        { game_id: game.id, line_number: 2 },
        { game_id: game.id, line_number: 3 },
      ]);
      await supabase.from('defense_line_slots').insert([
        { game_id: game.id, line_number: 1 },
        { game_id: game.id, line_number: 2 },
        { game_id: game.id, line_number: 3 },
      ]);
      // Realtime subscription picks up the INSERT and calls fetchGames
    }
  }, [teamId]);

  // ── Derived game lists ─────────────────────────────────────────────────
  const upcomingGames = games.filter((g) => {
    const cls = classifyGame(g, now);
    return cls === 'upcoming' || cls === 'in-progress';
  });

  const pastGames = games
    .filter((g) => classifyGame(g, now) === 'past')
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  // First upcoming/in-progress game goes in the next game card
  const nextGame = upcomingGames[0] ?? null;

  // List below pills: upcoming excludes the next game card entry
  const listGames = activeFilter === 'upcoming' ? upcomingGames.slice(1) : pastGames;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </main>
    );
  }

  const zeroGames = games.length === 0;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Captain tab strip — one tab per team the captain manages */}
      {isCaptain && captainTeams.length > 0 && (
        <div
          className="border-b flex overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {captainTeams.map((t) => (
            <Link
              key={t.id}
              href={`/team/${t.id}`}
              className="font-display shrink-0 truncate px-3 py-2 text-sm font-bold transition-colors"
              style={{
                maxWidth: 120,
                textDecoration: 'none',
                ...(t.id === teamId
                  ? { backgroundColor: 'var(--tab-active-bg)', color: 'var(--tab-active-text)' }
                  : { color: 'var(--tab-inactive-text)' }),
              }}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      <main className="flex-1 p-4 w-full max-w-2xl mx-auto">
        {zeroGames ? (
          <ZeroGamesState isCaptain={isCaptain} onAddGame={() => setShowAddGame(true)} />
        ) : (
          <>
            {/* Next game card — always visible when games exist, regardless of pill filter */}
            <NextGameCard
              game={nextGame}
              teamId={teamId}
              isCaptain={isCaptain}
              now={now}
              onAddGame={() => setShowAddGame(true)}
            />

            {/* Pill filter */}
            <div className="flex gap-2 mt-4 mb-3">
              {(['upcoming', 'past'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors"
                  style={
                    activeFilter === filter
                      ? { backgroundColor: 'var(--accent)', color: '#FFFFFF' }
                      : { border: '1px solid var(--border)', color: 'var(--text-secondary)' }
                  }
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Game list */}
            {listGames.length === 0 ? (
              <EmptyListState filter={activeFilter} isCaptain={isCaptain} />
            ) : (
              <div className="flex flex-col gap-2">
                {listGames.map((game) => (
                  <GameCard key={game.id} game={game} teamId={teamId} isCaptain={isCaptain} />
                ))}
              </div>
            )}

            {/* Add game — captain only, dashed border below list */}
            {isCaptain && (
              <button
                onClick={() => setShowAddGame(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium"
                style={{
                  border: '2px dashed var(--border)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                + Add game
              </button>
            )}
          </>
        )}
      </main>

      <AddGameForm
        open={showAddGame}
        onClose={() => setShowAddGame(false)}
        onAdd={addGame}
      />
    </div>
  );
}
