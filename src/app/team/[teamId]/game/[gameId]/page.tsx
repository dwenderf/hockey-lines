'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/client';
import { useIsTeamCaptain } from '@/hooks/useIsTeamCaptain';
import { CaptainGameView } from '@/components/games/CaptainGameView';
import { DragStateContext } from '@/hooks/useDragState';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { LinesBoard } from '@/components/lines/LinesBoard';
import { BenchCarousel } from '@/components/roster/BenchCarousel';
import { BackToTeam } from '@/components/BackToTeam';
import { formatOpponent } from '@/lib/formatOpponent';
import type { RosterPlayer, Game, ForwardLineSlot, DefenseLineSlot } from '@/lib/types';

function gameDate(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── Player (read-only) view ────────────────────────────────────────────────

function PlayerGameView({
  teamId,
  gameId,
  game,
  teamName,
}: {
  teamId: string;
  gameId: string;
  game: Game;
  teamName: string;
}) {
  const isTouchDevice = useIsTouchDevice();

  const [players, setPlayers]           = useState<RosterPlayer[]>([]);
  const [forwardSlots, setForwardSlots] = useState<ForwardLineSlot[]>([]);
  const [defenseSlots, setDefenseSlots] = useState<DefenseLineSlot[]>([]);
  const [absentIds, setAbsentIds]       = useState<string[]>([]);
  const [loaded, setLoaded]             = useState(false);
  const [showDots, setShowDots]         = useState(false);

  useEffect(() => {
    const supabase = createPublicClient();
    let forwardCh: ReturnType<typeof supabase.channel> | null = null;
    let defenseCh: ReturnType<typeof supabase.channel> | null = null;
    let absenceCh: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const [{ data: pData }, { data: fData }, { data: dData }, { data: aData }] = await Promise.all([
        supabase
          .from('public_roster_view')
          .select('*')
          .eq('team_id', game.team_id)
          .order('display_name'),
        supabase.from('forward_line_slots').select('*').eq('game_id', gameId).order('line_number'),
        supabase.from('defense_line_slots').select('*').eq('game_id', gameId).order('line_number'),
        supabase.from('game_absences').select('player_id').eq('game_id', gameId),
      ]);

      if (pData) setPlayers(
        (pData as Record<string, unknown>[])
          .filter((r) => r.is_active)
          .map((r) => ({
            id: r.player_id as string,
            name: r.display_name as string,
            is_goalie: r.is_goalie as boolean,
            roster_id: r.id as string,
            team_id: r.team_id as string,
            positions: (r.positions ?? {}) as RosterPlayer['positions'],
            player_level: r.player_level as RosterPlayer['player_level'],
            is_team_admin: r.is_team_admin as boolean,
            is_active: r.is_active as boolean,
            jersey_number: (r.jersey_number ?? null) as string | null,
            player_nickname: (r.player_nickname ?? null) as string | null,
            display_name: r.display_name as string,
          }))
      );
      if (fData) setForwardSlots(fData);
      if (dData) setDefenseSlots(dData);
      if (aData) setAbsentIds(aData.map((a) => a.player_id));
      setLoaded(true);

      forwardCh = supabase
        .channel(`pub-forward-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forward_line_slots', filter: `game_id=eq.${gameId}` }, (payload) => {
          if (payload.eventType === 'UPDATE')
            setForwardSlots((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as ForwardLineSlot : s));
          else if (payload.eventType === 'INSERT')
            setForwardSlots((prev) => [...prev, payload.new as ForwardLineSlot].sort((a, b) => a.line_number - b.line_number));
        })
        .subscribe();

      defenseCh = supabase
        .channel(`pub-defense-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'defense_line_slots', filter: `game_id=eq.${gameId}` }, (payload) => {
          if (payload.eventType === 'UPDATE')
            setDefenseSlots((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as DefenseLineSlot : s));
          else if (payload.eventType === 'INSERT')
            setDefenseSlots((prev) => [...prev, payload.new as DefenseLineSlot].sort((a, b) => a.line_number - b.line_number));
        })
        .subscribe();

      absenceCh = supabase
        .channel(`pub-absences-${gameId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_absences', filter: `game_id=eq.${gameId}` }, (payload) => {
          setAbsentIds((prev) => [...prev, (payload.new as { player_id: string }).player_id]);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'game_absences' }, async () => {
          const { data } = await supabase.from('game_absences').select('player_id').eq('game_id', gameId);
          if (data) setAbsentIds(data.map((a) => a.player_id));
        })
        .subscribe();
    };

    init().catch(console.error);
    return () => {
      forwardCh?.unsubscribe();
      defenseCh?.unsubscribe();
      absenceCh?.unsubscribe();
    };
  }, [gameId, game.team_id]);

  const absentPlayerIds = useMemo(() => new Set(absentIds), [absentIds]);

  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of forwardSlots) {
      if (s.lw_player_id) ids.add(s.lw_player_id);
      if (s.c_player_id)  ids.add(s.c_player_id);
      if (s.rw_player_id) ids.add(s.rw_player_id);
    }
    for (const s of defenseSlots) {
      if (s.ld_player_id) ids.add(s.ld_player_id);
      if (s.rd_player_id) ids.add(s.rd_player_id);
    }
    return ids;
  }, [forwardSlots, defenseSlots]);

  const scratchedPlayers = useMemo(
    () => players.filter((p) => p.is_active && absentPlayerIds.has(p.id)),
    [players, absentPlayerIds]
  );

  const dragCtxValue = useMemo(() => ({
    activeDragPlayerId: null,
    absentPlayerIds,
    isTouchDevice,
    isEditMode: false,
    setEditMode: () => {},
    selectedPlayerId: null,
    setSelectedPlayerId: () => {},
  }), [isTouchDevice, absentPlayerIds]);

  return (
    <DragStateContext.Provider value={dragCtxValue}>
      <div className="flex h-dvh flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
        {/* Header */}
        <header
          className="border-b px-6 pt-2 pb-3 shadow-sm flex-shrink-0"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <BackToTeam teamId={teamId} teamName={teamName} />
          <div className="mt-0.5">
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatOpponent(game.opponent, game.is_home)}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {gameDate(game.starts_at)}
            </p>
          </div>
        </header>

        {/* Draft banner — shown when lines are not yet finalized */}
        {!game.is_published && (
          <div
            className="flex items-center gap-2 px-6 py-2 text-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--bench)', color: 'var(--text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            Draft — lines may still change
          </div>
        )}

        {/* Sub-header — Show Preferred Positions toggle */}
        <div
          className="border-b px-6 py-2 flex items-center justify-end flex-shrink-0"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
            <span>Show Preferred Positions</span>
            <button
              role="switch"
              aria-checked={showDots}
              onClick={() => setShowDots((v) => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none"
              style={{ backgroundColor: showDots ? 'var(--accent)' : 'var(--border)' }}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  showDots ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Scrollable lines area */}
        <main className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="flex h-full items-center justify-center">
              <p style={{ color: 'var(--text-secondary)' }}>Loading lines...</p>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl p-4 pb-6">
              <LinesBoard
                forwardSlots={forwardSlots}
                defenseSlots={defenseSlots}
                players={players}
                scratchedPlayers={scratchedPlayers}
                readOnly
                showDots={showDots}
              />
            </div>
          )}
        </main>

        {/* Bench carousel — pinned at bottom */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ height: 110, backgroundColor: 'var(--bench)', borderTop: '1px solid var(--border)' }}
        >
          <BenchCarousel
            players={players}
            assignedPlayerIds={assignedPlayerIds}
            absentPlayerIds={absentPlayerIds}
            readOnly
          />
        </div>
      </div>
    </DragStateContext.Provider>
  );
}

// ── Page — fetches game + team, then routes based on captain status ─────────

export default function TeamGamePage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();

  const [game, setGame]       = useState<Game | null>(null);
  const [teamName, setTeamName] = useState('');
  const [status, setStatus]   = useState<'loading' | 'not-found' | 'error' | 'ready'>('loading');

  const { isCaptain, loading: captainLoading } = useIsTeamCaptain(teamId);

  // Fetch team name + game data (minimal — view components handle the rest)
  useEffect(() => {
    const supabase = createPublicClient();

    const init = async () => {
      const [{ data: teamData }, { data: gameData }] = await Promise.all([
        supabase.from('teams').select('name').eq('id', teamId).single(),
        supabase.from('games').select('*').eq('id', gameId).eq('team_id', teamId).single(),
      ]);

      if (!gameData) { setStatus('not-found'); return; }
      if (teamData) setTeamName(teamData.name);
      setGame(gameData);
      setStatus('ready');
    };

    init().catch(() => setStatus('error'));
  }, [teamId, gameId]);

  // Show loading until both the game fetch and the captain check are done
  const isLoading = status === 'loading' || captainLoading;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Unable to load. Try refreshing the page.</p>
      </main>
    );
  }

  if (status === 'not-found' || !game) {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Game not found.</p>
      </main>
    );
  }

  // Captain — full editable lines view
  if (isCaptain) {
    return (
      <CaptainGameView
        teamId={teamId}
        gameId={gameId}
        initialGame={game}
        teamName={teamName}
      />
    );
  }

  // Player — read-only view with draft banner
  return (
    <PlayerGameView
      teamId={teamId}
      gameId={gameId}
      game={game}
      teamName={teamName}
    />
  );
}
