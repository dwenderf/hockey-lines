'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DefenseLineSlot } from '@/lib/types';

export function useDefenseSlots(gameId: string | null) {
  const [slots, setSlots] = useState<DefenseLineSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!gameId) { setSlots([]); setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('defense_line_slots')
      .select('*')
      .eq('game_id', gameId)
      .order('line_number');
    if (data) setSlots(data);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!gameId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`defense-slots-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'defense_line_slots', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSlots((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as DefenseLineSlot) : s))
            );
          } else if (payload.eventType === 'INSERT') {
            setSlots((prev) => [...prev, payload.new as DefenseLineSlot].sort((a, b) => a.line_number - b.line_number));
          } else if (payload.eventType === 'DELETE') {
            setSlots((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const updateSlot = useCallback(
    async (slotId: string, column: string, playerId: string | null) => {
      const supabase = createClient();
      const prev = slots.find((s) => s.id === slotId);
      setSlots((curr) =>
        curr.map((s) => (s.id === slotId ? { ...s, [column]: playerId } : s))
      );
      const { error } = await supabase
        .from('defense_line_slots')
        .update({ [column]: playerId })
        .eq('id', slotId);
      if (error && prev) {
        setSlots((curr) =>
          curr.map((s) => (s.id === slotId ? prev : s))
        );
      }
    },
    [slots]
  );

  const addLine = useCallback(async () => {
    if (!gameId) return;
    const nextLineNumber = slots.length + 1;
    if (nextLineNumber > 4) return;
    const supabase = createClient();
    await supabase.from('defense_line_slots').insert({ game_id: gameId, line_number: nextLineNumber });
    await fetch();
  }, [gameId, slots.length, fetch]);

  return { slots, loading, updateSlot, addLine };
}
