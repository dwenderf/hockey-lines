'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useIsTeamCaptain } from '@/hooks/useIsTeamCaptain';
import { GameFormModal } from '@/components/games/GameFormModal';
import { RosterTab } from '@/components/roster/RosterTab';
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

// ── Icons ──────────────────────────────────────────────────────────────────

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

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GamesTabIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9H21" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function RosterTabIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13.5 20c0-2.485 1.567-4.5 3.5-4.5s3.5 2.015 3.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Game sub-components ────────────────────────────────────────────────────

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
  onEdit,
}: {
  game: Game | null;
  teamId: string;
  isCaptain: boolean;
  now: number;
  onAddGame: () => void;
  onEdit: (game: Game) => void;
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
      className="relative rounded-lg border"
      style={{ backgroundColor: 'var(--next-game-bg)', borderColor: 'var(--accent)' }}
    >
      <Link
        href={`/team/${teamId}/game/${game.id}`}
        className="block p-4"
        style={{ textDecoration: 'none', paddingRight: isCaptain ? '52px' : '16px' }}
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
          <div>
            {isCaptain && (
              <span
                className="text-xs"
                style={{ color: game.is_published ? 'var(--pill-published-text)' : 'var(--text-secondary)' }}
              >
                {game.is_published ? '✓ Published' : '· Draft'}
              </span>
            )}
          </div>
          {!isCaptain && (
            <span style={{ color: 'var(--text-secondary)' }}>
              <ChevronRightIcon />
            </span>
          )}
        </div>
      </Link>
      {isCaptain && (
        <button
          onClick={() => onEdit(game)}
          aria-label="Edit game"
          className="absolute top-0 right-0 flex items-center justify-center"
          style={{ width: 44, height: 44, color: 'var(--text-secondary)' }}
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

function GameCard({
  game,
  teamId,
  isCaptain,
  onEdit,
}: {
  game: Game;
  teamId: string;
  isCaptain: boolean;
  onEdit: (game: Game) => void;
}) {
  return (
    <div
      className="relative rounded-lg border"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <Link
        href={`/team/${teamId}/game/${game.id}`}
        className="block p-3"
        style={{ textDecoration: 'none', paddingRight: isCaptain ? '52px' : '12px' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {formatGameDate(game.starts_at)}
        </p>
        <p className="font-display text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
          {formatOpponent(game.opponent, game.is_home)}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div>{isCaptain && <StatusPill isPublished={game.is_published} />}</div>
          {!isCaptain && (
            <span style={{ color: 'var(--text-secondary)' }}>
              <ChevronRightIcon />
            </span>
          )}
        </div>
      </Link>
      {isCaptain && (
        <button
          onClick={() => onEdit(game)}
          aria-label="Edit game"
          className="absolute top-0 right-0 flex items-center justify-center"
          style={{ width: 44, height: 44, color: 'var(--text-secondary)' }}
        >
          <PencilIcon />
        </button>
      )}
    </div>
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

// ── Games tab content ──────────────────────────────────────────────────────

function GamesContent({
  teamId,
  isCaptain,
  games,
  now,
  activeFilter,
  setActiveFilter,
  onAddGame,
  onEdit,
}: {
  teamId: string;
  isCaptain: boolean;
  games: Game[];
  now: number;
  activeFilter: 'upcoming' | 'past';
  setActiveFilter: (f: 'upcoming' | 'past') => void;
  onAddGame: () => void;
  onEdit: (game: Game) => void;
}) {
  const upcomingGames = games.filter((g) => {
    const cls = classifyGame(g, now);
    return cls === 'upcoming' || cls === 'in-progress';
  });

  const pastGames = games
    .filter((g) => classifyGame(g, now) === 'past')
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  const nextGame = upcomingGames[0] ?? null;
  const listGames = activeFilter === 'upcoming' ? upcomingGames.slice(1) : pastGames;
  const zeroGames = games.length === 0;

  return (
    <div className="p-4 w-full max-w-2xl mx-auto">
      {zeroGames ? (
        <ZeroGamesState isCaptain={isCaptain} onAddGame={onAddGame} />
      ) : (
        <>
          <NextGameCard
            game={nextGame}
            teamId={teamId}
            isCaptain={isCaptain}
            now={now}
            onAddGame={onAddGame}
            onEdit={onEdit}
          />

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

          {listGames.length === 0 ? (
            <EmptyListState filter={activeFilter} isCaptain={isCaptain} />
          ) : (
            <div className="flex flex-col gap-2">
              {listGames.map((game) => (
                <GameCard key={game.id} game={game} teamId={teamId} isCaptain={isCaptain} onEdit={onEdit} />
              ))}
            </div>
          )}

          {isCaptain && (
            <button
              onClick={onAddGame}
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
    </div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: 'games' | 'roster';
  onTabChange: (tab: 'games' | 'roster') => void;
}) {
  return (
    <div
      className="flex border-t"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {(['games', 'roster'] as const).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium capitalize transition-colors"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            {tab === 'games' ? <GamesTabIcon /> : <RosterTabIcon />}
            {tab === 'games' ? 'Games' : 'Roster'}
          </button>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TeamHubPage() {
  const { teamId } = useParams<{ teamId: string }>();

  const { isCaptain, loading: captainLoading } = useIsTeamCaptain(teamId);

  const [team, setTeam]               = useState<Team | null>(null);
  const [games, setGames]             = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [now, setNow]                 = useState(Date.now());
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [showAddGame, setShowAddGame] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [authUser, setAuthUser]       = useState<{ id: string } | null>(null);
  const [activeTab, setActiveTab]     = useState<'games' | 'roster'>('games');

  const touchStartXRef = useRef<number | null>(null);
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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setAuthUser(data.user));
  }, []);

  const handleLogout = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.reload();
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const delta = touchStartXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      setActiveTab(delta > 0 ? 'roster' : 'games');
    }
    touchStartXRef.current = null;
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </main>
    );
  }

  return (
    <div className="flex flex-col" style={{ backgroundColor: 'var(--bg-page)', height: '100dvh' }}>
      {/* Team header */}
      <div
        className="flex items-center justify-between border-b shrink-0"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', minHeight: 44 }}
      >
        {isCaptain ? (
          <Link
            href="/manage"
            className="flex items-center gap-1 px-3 py-2 font-display text-sm font-bold flex-1"
            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {team?.name ?? ''}
          </Link>
        ) : (
          <span className="px-3 py-2 font-display text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {team?.name ?? ''}
          </span>
        )}
        {authUser ? (
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            Log out
          </button>
        ) : (
          <Link
            href="/login"
            className="px-3 py-2 text-sm shrink-0"
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            Log in
          </Link>
        )}
      </div>

      {/* Swipeable tab content */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            width: '200%',
            transform: activeTab === 'games' ? 'translateX(0)' : 'translateX(-50%)',
            transition: 'transform 200ms ease',
          }}
        >
          {/* Games panel */}
          <div className="w-1/2 h-full overflow-y-auto">
            <GamesContent
              teamId={teamId}
              isCaptain={isCaptain}
              games={games}
              now={now}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onAddGame={() => setShowAddGame(true)}
              onEdit={(g) => setEditingGame(g)}
            />
          </div>

          {/* Roster panel */}
          <div className="w-1/2 h-full overflow-y-auto">
            <RosterTab teamId={teamId} isCaptain={isCaptain} />
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {(showAddGame || editingGame !== null) && (
        <GameFormModal
          teamId={teamId}
          game={editingGame ?? undefined}
          onSuccess={() => { setShowAddGame(false); setEditingGame(null); }}
          onClose={() => { setShowAddGame(false); setEditingGame(null); }}
        />
      )}
    </div>
  );
}
