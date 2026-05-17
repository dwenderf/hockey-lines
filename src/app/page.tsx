'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LinesBoard } from '@/components/lines/LinesBoard';
import type { Player, Game, ForwardLineSlot, DefenseLineSlot } from '@/lib/types';

const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID!;

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

export default function PublicPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [forwardSlots, setForwardSlots] = useState<ForwardLineSlot[]>([]);
  const [defenseSlots, setDefenseSlots] = useState<DefenseLineSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const now = new Date().toISOString();

      const { data: games } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', TEAM_ID)
        .order('starts_at', { ascending: true });

      const nextGame = games?.find((g) => g.starts_at >= now) ?? games?.[games.length - 1] ?? null;
      setGame(nextGame);

      if (!nextGame) { setLoading(false); return; }

      const [{ data: pData }, { data: fData }, { data: dData }] = await Promise.all([
        supabase.from('players').select('*').eq('team_id', TEAM_ID).order('name'),
        supabase.from('forward_line_slots').select('*').eq('game_id', nextGame.id).order('line_number'),
        supabase.from('defense_line_slots').select('*').eq('game_id', nextGame.id).order('line_number'),
      ]);

      if (pData) setPlayers(pData);
      if (fData) setForwardSlots(fData);
      if (dData) setDefenseSlots(dData);
      setLoading(false);

      supabase
        .channel(`public-forward-${nextGame.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'forward_line_slots', filter: `game_id=eq.${nextGame.id}` }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setForwardSlots((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as ForwardLineSlot : s));
          } else if (payload.eventType === 'INSERT') {
            setForwardSlots((prev) => [...prev, payload.new as ForwardLineSlot].sort((a, b) => a.line_number - b.line_number));
          }
        })
        .subscribe();

      supabase
        .channel(`public-defense-${nextGame.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'defense_line_slots', filter: `game_id=eq.${nextGame.id}` }, (payload) => {
          if (payload.eventType === 'UPDATE') {
            setDefenseSlots((prev) => prev.map((s) => s.id === payload.new.id ? payload.new as DefenseLineSlot : s));
          } else if (payload.eventType === 'INSERT') {
            setDefenseSlots((prev) => [...prev, payload.new as DefenseLineSlot].sort((a, b) => a.line_number - b.line_number));
          }
        })
        .subscribe();
    };

    init();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">Loading lines...</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-500">No upcoming games scheduled.</p>
        <a href="/login" className="text-xs text-blue-500 hover:underline">Captain login</a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hockey Lines</h1>
          <p className="text-sm text-gray-500 mt-0.5">{formatGame(game)}</p>
        </div>
        <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">Captain</a>
      </header>
      <div className="mx-auto max-w-2xl p-6">
        <LinesBoard
          forwardSlots={forwardSlots}
          defenseSlots={defenseSlots}
          players={players}
          readOnly
        />
      </div>
    </main>
  );
}
