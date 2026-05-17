'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Player, Position, Preference } from '@/lib/types';

export function usePlayers(teamId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('name');
    if (data) setPlayers(data);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addPlayer = useCallback(
    async (name: string, isGoalie: boolean) => {
      if (!teamId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('players')
        .insert({ team_id: teamId, name, is_goalie: isGoalie })
        .select()
        .single();
      if (data) setPlayers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    },
    [teamId]
  );

  const removePlayer = useCallback(async (playerId: string) => {
    const supabase = createClient();
    await supabase.from('players').delete().eq('id', playerId);
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const updatePreference = useCallback(
    async (playerId: string, position: Position, preference: Exclude<Preference, 'unset'> | null) => {
      const supabase = createClient();
      const player = players.find((p) => p.id === playerId);
      if (!player) return;
      const positions = { ...player.positions };
      if (preference === null) {
        delete positions[position];
      } else {
        positions[position] = preference;
      }
      await supabase.from('players').update({ positions }).eq('id', playerId);
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, positions } : p))
      );
    },
    [players]
  );

  const updateLevel = useCallback(
    async (playerId: string, level: 1 | 2 | 3 | 4 | 5 | null) => {
      const supabase = createClient();
      await supabase.from('players').update({ player_level: level }).eq('id', playerId);
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, player_level: level } : p))
      );
    },
    []
  );

  return { players, loading, addPlayer, removePlayer, updatePreference, updateLevel };
}
