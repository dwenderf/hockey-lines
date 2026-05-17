'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ForwardLineSlot } from '@/lib/types';

export function useForwardSlots(gameId: string | null) {
  const [slots, setSlots] = useState<ForwardLineSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!gameId) { setSlots([]); setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from('forward_line_slots')
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
      .channel(`forward-slots-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forward_line_slots', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSlots((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as ForwardLineSlot) : s))
            );
          } else if (payload.eventType === 'INSERT') {
            setSlots((prev) => [...prev, payload.new as ForwardLineSlot].sort((a, b) => a.line_number - b.line_number));
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
      // optimistic update
      setSlots((curr) =>
        curr.map((s) => (s.id === slotId ? { ...s, [column]: playerId } : s))
      );
      const { error } = await supabase
        .from('forward_line_slots')
        .update({ [column]: playerId })
        .eq('id', slotId);
      if (error && prev) {
        // revert
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
    await supabase.from('forward_line_slots').insert({ game_id: gameId, line_number: nextLineNumber });
    await fetch();
  }, [gameId, slots.length, fetch]);

  return { slots, loading, updateSlot, addLine };
}
