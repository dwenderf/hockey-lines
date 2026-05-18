'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Game } from '@/lib/types';

export function useGames(teamId: string | null) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('team_id', teamId)
      .order('starts_at', { ascending: true });
    if (data) {
      setGames(data);
      if (!selectedGameId) {
        const now = new Date().toISOString();
        const next = data.find((g) => g.starts_at >= now);
        setSelectedGameId(next?.id ?? data[data.length - 1]?.id ?? null);
      }
    }
    setLoading(false);
  }, [teamId, selectedGameId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addGame = useCallback(
    async (opponent: string, isHome: boolean, startsAt: string) => {
      if (!teamId) return;
      const supabase = createClient();
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
        setGames((prev) => [...prev, game].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        setSelectedGameId(game.id);
      }
    },
    [teamId]
  );

  const publishGame = useCallback(async (gameId: string) => {
    const supabase = createClient();
    await supabase.from('games').update({ is_published: true }).eq('id', gameId);
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, is_published: true } : g));
  }, []);

  const unpublishGame = useCallback(async (gameId: string) => {
    const supabase = createClient();
    await supabase.from('games').update({ is_published: false }).eq('id', gameId);
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, is_published: false } : g));
  }, []);

  return { games, selectedGameId, setSelectedGameId, loading, addGame, publishGame, unpublishGame };
}
