'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/client';
import { DragStateContext } from '@/hooks/useDragState';
import { useIsTouchDevice } from '@/hooks/useIsTouchDevice';
import { LinesBoard } from '@/components/lines/LinesBoard';
import { BenchCarousel } from '@/components/roster/BenchCarousel';
import type { RosterPlayer, Game, ForwardLineSlot, DefenseLineSlot } from '@/lib/types';

function gameOpponent(game: Game): string {
  return `${game.is_home ? 'vs' : '@'} ${game.opponent}`;
}

function gameDate(game: Game): string {
  return new Date(game.starts_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PublicGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const isTouchDevice = useIsTouchDevice();

  const [game, setGame]               = useState<Game | null>(null);
  const [teamName, setTeamName]       = useState('');
  const [players, setPlayers]         = useState<RosterPlayer[]>([]);
  const [forwardSlots, setForwardSlots] = useState<ForwardLineSlot[]>([]);
  const [defenseSlots, setDefenseSlots] = useState<DefenseLineSlot[]>([]);
  const [absentIds, setAbsentIds]     = useState<string[]>([]);
  const [status, setStatus]           = useState<'loading' | 'not-found' | 'unpublished' | 'error' | 'ready'>('loading');
  const [showDots, setShowDots]       = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createPublicClient();
    let forwardCh: ReturnType<typeof supabase.channel> | null = null;
    let defenseCh: ReturnType<typeof supabase.channel> | null = null;
    let absenceCh: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: gameData } = await supabase
        .from('games').select('*').eq('id', gameId).single();

      if (!gameData) { setStatus('not-found'); return; }
      if (!gameData.is_published) { setStatus('unpublished'); return; }
      setGame(gameData);

      const [{ data: pData }, { data: fData }, { data: dData }, { data: aData }, { data: teamData }] = await Promise.all([
        supabase
          .from('public_roster_view')
          .select('*')
          .eq('team_id', gameData.team_id)
          .order('display_name'),
        supabase.from('forward_line_slots').select('*').eq('game_id', gameId).order('line_number'),
        supabase.from('defense_line_slots').select('*').eq('game_id', gameId).order('line_number'),
        supabase.from('game_absences').select('player_id').eq('game_id', gameId),
        supabase.from('teams').select('name').eq('id', gameData.team_id).single(),
      ]);

      if (teamData) setTeamName(teamData.name);
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
      setStatus('ready');

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

      // INSERT: filter by game_id works. DELETE: game_id isn't in payload.old without
      // REPLICA IDENTITY FULL, so the filter drops those events. Use separate subscriptions.
      absenceCh = supabase
        .channel(`pub-absences-${gameId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_absences', filter: `game_id=eq.${gameId}` }, (payload) => {
          setAbsentIds((prev) => [...prev, (payload.new as { player_id: string }).player_id]);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'game_absences' }, async () => {
          // Can't filter by game_id on DELETE without REPLICA IDENTITY FULL — re-fetch is safe
          const { data } = await supabase.from('game_absences').select('player_id').eq('game_id', gameId);
          if (data) setAbsentIds(data.map((a) => a.player_id));
        })
        .subscribe();
    };

    init().catch(() => setStatus('error'));
    return () => {
      forwardCh?.unsubscribe();
      defenseCh?.unsubscribe();
      absenceCh?.unsubscribe();
    };
  }, [gameId]);

  // ── Derived sets ──────────────────────────────────────────────────────
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

  // ── Static read-only context value ───────────────────────────────────
  // Provides isTouchDevice so mobile chip sizing works; all interaction
  // state is permanently false / no-op since this is a read-only view.
  const dragCtxValue = useMemo(() => ({
    activeDragPlayerId: null,
    absentPlayerIds,
    isTouchDevice,
    isEditMode: false,
    setEditMode: () => {},
    selectedPlayerId: null,
    setSelectedPlayerId: () => {},
  }), [isTouchDevice, absentPlayerIds]);

  // ── Loading / error states ────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading lines...</p>
      </main>
    );
  }
  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Unable to load lines. Try refreshing the page.</p>
      </main>
    );
  }
  if (status === 'not-found') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Game not found.</p>
      </main>
    );
  }
  if (status === 'unpublished') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--bg-page)' }}>
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Lines not yet available</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Check back closer to game time.</p>
      </main>
    );
  }

  // ── Player view layout ────────────────────────────────────────────────
  return (
    <DragStateContext.Provider value={dragCtxValue}>
      <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
        {/* Header */}
        <header className="border-b px-6 py-4 shadow-sm flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{teamName}</h1>
            {game && (
              <>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{gameOpponent(game)}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{gameDate(game)}</p>
              </>
            )}
          </div>
          <a href="/manage" className="text-xs" style={{ color: 'var(--text-secondary)' }}>Captain</a>
        </header>

        {/* Sub-header — Show Positions toggle */}
        <div className="border-b px-6 py-2 flex items-center justify-end flex-shrink-0"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
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
        </main>

        {/* Bench carousel — pinned at bottom */}
        <div className="flex-shrink-0 overflow-hidden" style={{ height: 110, backgroundColor: 'var(--bench)', borderTop: '1px solid var(--border)' }}>
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
