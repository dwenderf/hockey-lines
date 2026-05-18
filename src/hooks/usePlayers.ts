'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RosterPlayer, Position, Preference } from '@/lib/types';

export function usePlayers(teamId: string | null) {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!teamId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('rosters')
      .select(`
        id,
        team_id,
        player_id,
        positions,
        player_level,
        is_team_admin,
        is_active,
        players ( id, name, is_goalie )
      `)
      .eq('team_id', teamId)
      .order('players(name)');

    if (data) {
      setPlayers(
        data.map((r) => {
          const p = r.players as unknown as { id: string; name: string; is_goalie: boolean };
          return {
            id: p.id,
            name: p.name,
            is_goalie: p.is_goalie,
            roster_id: r.id,
            team_id: r.team_id,
            positions: r.positions,
            player_level: r.player_level,
            is_team_admin: r.is_team_admin,
            is_active: r.is_active,
          };
        })
      );
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

      // Insert player identity row
      const { data: player } = await supabase
        .from('players')
        .insert({ name, is_goalie: isGoalie })
        .select()
        .single();
      if (!player) return;

      // Check if this player has a roster entry elsewhere to copy positions from
      const { data: existingRoster } = await supabase
        .from('rosters')
        .select('positions')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Insert roster entry with copied positions as defaults
      const { data: roster } = await supabase
        .from('rosters')
        .insert({
          team_id: teamId,
          player_id: player.id,
          positions: existingRoster?.positions ?? {},
        })
        .select()
        .single();

      if (roster) {
        const rosterPlayer: RosterPlayer = {
          id: player.id,
          name: player.name,
          is_goalie: player.is_goalie,
          roster_id: roster.id,
          team_id: roster.team_id,
          positions: roster.positions,
          player_level: roster.player_level,
          is_team_admin: roster.is_team_admin,
          is_active: roster.is_active,
        };
        setPlayers((prev) =>
          [...prev, rosterPlayer].sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    },
    [teamId]
  );

  const addExistingPlayer = useCallback(
    async (playerId: string) => {
      if (!teamId) return;
      const supabase = createClient();

      // Get player identity
      const { data: player } = await supabase
        .from('players')
        .select('id, name, is_goalie')
        .eq('id', playerId)
        .single();
      if (!player) return;

      // Copy positions from most recent roster entry for this player
      const { data: existingRoster } = await supabase
        .from('rosters')
        .select('positions')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: roster } = await supabase
        .from('rosters')
        .insert({
          team_id: teamId,
          player_id: playerId,
          positions: existingRoster?.positions ?? {},
        })
        .select()
        .single();

      if (roster) {
        const rosterPlayer: RosterPlayer = {
          id: player.id,
          name: player.name,
          is_goalie: player.is_goalie,
          roster_id: roster.id,
          team_id: roster.team_id,
          positions: roster.positions,
          player_level: roster.player_level,
          is_team_admin: roster.is_team_admin,
          is_active: roster.is_active,
        };
        setPlayers((prev) =>
          [...prev, rosterPlayer].sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    },
    [teamId]
  );

  // Deactivate rather than delete — preserves historical line assignments
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

  return { players, loading, addPlayer, addExistingPlayer, deactivatePlayer, reactivatePlayer, updatePreference, updateLevel };
}
