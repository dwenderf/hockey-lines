'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { GameAbsence } from '@/lib/types';

export function useGameAbsences(gameId: string | null) {
  const [absences, setAbsences] = useState<GameAbsence[]>([]);

  const fetch = useCallback(async () => {
    if (!gameId) { setAbsences([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('game_absences')
      .select('id, game_id, player_id')
      .eq('game_id', gameId);
    if (data) setAbsences(data);
  }, [gameId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!gameId) return;
    const supabase = createClient();
    // INSERT: filter by game_id works fine (payload.new has all columns).
    // DELETE: Supabase only includes the primary key in payload.old by default
    // (REPLICA IDENTITY DEFAULT), so a game_id filter silently drops DELETE events.
    // Use a separate unfiltered DELETE subscription and match by primary key.
    const channel = supabase
      .channel(`game-absences-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_absences', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setAbsences((prev) => [...prev, payload.new as GameAbsence]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_absences' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setAbsences((prev) => prev.filter((a) => a.id !== deletedId));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const markAbsent = useCallback(
    async (playerId: string) => {
      if (!gameId) return;
      const supabase = createClient();
      const optimistic: GameAbsence = { id: `temp-${playerId}`, game_id: gameId, player_id: playerId };
      setAbsences((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from('game_absences')
        .insert({ game_id: gameId, player_id: playerId })
        .select('id, game_id, player_id')
        .single();
      if (error) {
        setAbsences((prev) => prev.filter((a) => a.id !== optimistic.id));
      } else if (data) {
        setAbsences((prev) => prev.map((a) => (a.id === optimistic.id ? data : a)));
      }
    },
    [gameId]
  );

  const markAvailable = useCallback(
    async (playerId: string) => {
      if (!gameId) return;
      const supabase = createClient();
      const removed = absences.find((a) => a.player_id === playerId);
      setAbsences((prev) => prev.filter((a) => a.player_id !== playerId));
      const { error } = await supabase
        .from('game_absences')
        .delete()
        .eq('game_id', gameId)
        .eq('player_id', playerId);
      if (error && removed) {
        setAbsences((prev) => [...prev, removed]);
      }
    },
    [gameId, absences]
  );

  const absentPlayerIds = new Set(absences.map((a) => a.player_id));

  return { absences, absentPlayerIds, markAbsent, markAvailable };
}
