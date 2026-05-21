'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RosterPlayer, Position, Preference } from '@/lib/types';

function mapViewRow(r: Record<string, unknown>): RosterPlayer {
  return {
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
  };
}

export function usePlayers(teamId: string | null) {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('public_roster_view')
      .select('*')
      .eq('team_id', teamId)
      .order('display_name');

    if (data) {
      setPlayers((data as Record<string, unknown>[]).map(mapViewRow));
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addPlayer = useCallback(
    async (name: string, isGoalie: boolean) => {
      if (!teamId) return;
      const supabase = createClient();

      const { data: player } = await supabase
        .from('players')
        .insert({ name, is_goalie: isGoalie })
        .select()
        .single();
      if (!player) return;

      const { data: existingRoster } = await supabase
        .from('rosters')
        .select('positions')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      await supabase
        .from('rosters')
        .insert({
          team_id: teamId,
          player_id: player.id,
          positions: existingRoster?.positions ?? {},
        });

      await fetch();
    },
    [teamId, fetch]
  );

  const addExistingPlayer = useCallback(
    async (playerId: string) => {
      if (!teamId) return;
      const supabase = createClient();

      const { data: existingRoster } = await supabase
        .from('rosters')
        .select('positions')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      await supabase
        .from('rosters')
        .insert({
          team_id: teamId,
          player_id: playerId,
          positions: existingRoster?.positions ?? {},
        });

      await fetch();
    },
    [teamId, fetch]
  );

  const deactivatePlayer = useCallback(async (rosterId: string) => {
    const supabase = createClient();
    await supabase.from('rosters').update({ is_active: false }).eq('id', rosterId);
    setPlayers((prev) =>
      prev.map((p) => (p.roster_id === rosterId ? { ...p, is_active: false } : p))
    );
  }, []);

  const reactivatePlayer = useCallback(async (rosterId: string) => {
    const supabase = createClient();
    await supabase.from('rosters').update({ is_active: true }).eq('id', rosterId);
    setPlayers((prev) =>
      prev.map((p) => (p.roster_id === rosterId ? { ...p, is_active: true } : p))
    );
  }, []);

  const updatePreference = useCallback(
    async (rosterId: string, position: Position, preference: Exclude<Preference, 'unset'> | null) => {
      const supabase = createClient();
      const player = players.find((p) => p.roster_id === rosterId);
      if (!player) return;
      const positions = { ...player.positions };
      if (preference === null) {
        delete positions[position];
      } else {
        positions[position] = preference;
      }
      await supabase.from('rosters').update({ positions }).eq('id', rosterId);
      setPlayers((prev) =>
        prev.map((p) => (p.roster_id === rosterId ? { ...p, positions } : p))
      );
    },
    [players]
  );

  const updateLevel = useCallback(
    async (rosterId: string, level: 1 | 2 | 3 | 4 | 5 | null) => {
      const supabase = createClient();
      await supabase.from('rosters').update({ player_level: level }).eq('id', rosterId);
      setPlayers((prev) =>
        prev.map((p) => (p.roster_id === rosterId ? { ...p, player_level: level } : p))
      );
    },
    []
  );

  const updatePlayerDetails = useCallback(
    async (
      rosterId: string,
      playerId: string,
      data: {
        name: string;
        jersey_number: string | null;
        player_nickname: string | null;
        positions: Partial<Record<Position, Exclude<Preference, 'unset'>>>;
        player_level: 1 | 2 | 3 | 4 | 5 | null;
        is_active: boolean;
      }
    ) => {
      const supabase = createClient();
      const player = players.find((p) => p.roster_id === rosterId);

      const optimistic: Partial<RosterPlayer> = {
        name: data.name,
        display_name: data.player_nickname?.trim() || data.name,
        jersey_number: data.jersey_number,
        player_nickname: data.player_nickname,
        positions: data.positions,
        player_level: data.player_level,
        is_active: data.is_active,
      };

      setPlayers((prev) =>
        prev.map((p) => (p.roster_id === rosterId ? { ...p, ...optimistic } : p))
      );

      try {
        const { error: rosterError } = await supabase
          .from('rosters')
          .update({
            jersey_number: data.jersey_number,
            player_nickname: data.player_nickname,
            positions: data.positions,
            player_level: data.player_level,
            is_active: data.is_active,
          })
          .eq('id', rosterId);
        if (rosterError) throw rosterError;

        if (player && data.name !== player.name) {
          const { error: playerError } = await supabase
            .from('players')
            .update({ name: data.name })
            .eq('id', playerId);
          if (playerError) throw playerError;
        }
      } catch (err) {
        // Revert optimistic update
        if (player) {
          setPlayers((prev) =>
            prev.map((p) => (p.roster_id === rosterId ? player : p))
          );
        }
        throw err;
      }
    },
    [players]
  );

  return { players, loading, addPlayer, addExistingPlayer, deactivatePlayer, reactivatePlayer, updatePreference, updateLevel, updatePlayerDetails, refreshPlayers: fetch };
}
