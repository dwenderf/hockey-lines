'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LinesBoard } from '@/components/lines/LinesBoard';
import type { RosterPlayer, Game, ForwardLineSlot, DefenseLineSlot } from '@/lib/types';

function formatGame(game: Game): string {
  const date = new Date(game.starts_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${game.is_home ? 'vs' : '@'} ${game.opponent} — ${date}`;
}

export default function PublicGamePage() {
  const { gameId } = useParams<{ gameId: string }>();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [forwardSlots, setForwardSlots] = useState<ForwardLineSlot[]>([]);
  const [defenseSlots, setDefenseSlots] = useState<DefenseLineSlot[]>([]);
  const [status, setStatus] = useState<'loading' | 'not-found' | 'unpublished' | 'ready'>('loading');
  const [showDots, setShowDots] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let forwardChannel: ReturnType<typeof supabase.channel> | null = null;
    let defenseChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (!gameData) { setStatus('not-found'); return; }
      if (!gameData.is_published) { setStatus('unpublished'); return; }

      setGame(gameData);

      const [{ data: pData }, { data: fData }, { data: dData }] = await Promise.all([
        supabase
          .from('rosters')
          .select('id, team_id, player_id, positions, player_level, is_team_admin, is_active, players(id, name, is_goalie)')
          .eq('team_id', gameData.team_id)
          .eq('is_active', true)
          .order('players(name)'),
        supabase.from('forward_line_slots').select('*').eq('game_id', gameId).order('line_number'),
        supabase.from('defense_line_slots').select('*').eq('game_id', gameId).order('line_number'),
      ]);

      if (pData) setPlayers(pData.map((r) => {
        const p = r.players as unknown as { id: string; name: string; is_goalie: boolean };
        return { id: p.id, name: p.name, is_goalie: p.is_goalie, roster_id: r.id, team_id: r.team_id, positions: r.positions, player_level: r.player_level, is_team_admin: r.is_team_admin, is_active: r.is_active };
      }));
      if (fData) setForwardSlots(fData);
      if (dData) setDefenseSlots(dData);
      setStatus('ready');

      forwardChannel = supabase
        .channel(`game-forward-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forward_line_slots', filter: `game_id=eq.${gameId}` }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setForwardSlots((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as ForwardLineSlot : s));
          } else if (payload.eventType === 'INSERT') {
            setForwardSlots((prev) => [...prev, payload.new as ForwardLineSlot].sort((a, b) => a.line_number - b.line_number));
          }
        })
        .subscribe();

      defenseChannel = supabase
        .channel(`game-defense-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'defense_line_slots', filter: `game_id=eq.${gameId}` }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setDefenseSlots((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as DefenseLineSlot : s));
          } else if (payload.eventType === 'INSERT') {
            setDefenseSlots((prev) => [...prev, payload.new as DefenseLineSlot].sort((a, b) => a.line_number - b.line_number));
          }
        })
        .subscribe();
    };

    init();

    return () => {
      forwardChannel?.unsubscribe();
      defenseChannel?.unsubscribe();
    };
  }, [gameId]);

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading lines...</p>
      </main>
    );
  }

  if (status === 'not-found') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Game not found.</p>
      </main>
    );
  }

  if (status === 'unpublished') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-3">
        <p className="text-gray-700 font-medium">Lines not yet available</p>
        <p className="text-sm text-gray-400">Check back closer to game time.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hockey Lines</h1>
          {game && <p className="text-sm text-gray-500 mt-0.5">{formatGame(game)}</p>}
        </div>
        <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">Captain</a>
      </header>
      {/* Sub-header utility row — position matrix toggle for player view */}
      <div className="border-b border-gray-100 bg-white px-6 py-2 flex items-center justify-end">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <span>Show positions</span>
          <button
            role="switch"
            aria-checked={showDots}
            onClick={() => setShowDots((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
              showDots ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                showDots ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>
      <div className="mx-auto max-w-2xl p-6">
        <LinesBoard
          forwardSlots={forwardSlots}
          defenseSlots={defenseSlots}
          players={players}
          readOnly
          showDots={showDots}
        />
      </div>
    </main>
  );
}
