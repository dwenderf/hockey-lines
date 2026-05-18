'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Player } from '@/lib/types';

interface PlayerSearchProps {
  teamId: string;
  onAdd: (playerId: string) => void;
}

export function PlayerSearch({ teamId, onAdd }: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [teamPlayerIds, setTeamPlayerIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    const supabase = createClient();
    const [playersRes, rostersRes] = await Promise.all([
      supabase.from('players').select('id, name, is_goalie').order('name'),
      supabase.from('rosters').select('player_id').eq('team_id', teamId).eq('is_active', true),
    ]);
    if (playersRes.error) {
      setError(`Players load error: ${playersRes.error.message}`);
      return;
    }
    if (rostersRes.error) {
      setError(`Roster load error: ${rostersRes.error.message}`);
      return;
    }
    setAllPlayers(playersRes.data ?? []);
    setTeamPlayerIds(new Set((rostersRes.data ?? []).map((r) => r.player_id)));
  }, [teamId]);

  useEffect(() => {
    loadData();
    const supabase = createClient();
    const channel = supabase
      .channel('players-search')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const filtered = query.trim()
    ? allPlayers.filter(
        (p) =>
          !teamPlayerIds.has(p.id) &&
          p.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  // Players matching the query who are already on the team (to give better feedback)
  const alreadyOnTeam = query.trim()
    ? allPlayers.filter(
        (p) =>
          teamPlayerIds.has(p.id) &&
          p.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  const handleAdd = (player: Player) => {
    onAdd(player.id);
    setTeamPlayerIds((prev) => new Set([...prev, player.id]));
    setQuery('');
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search existing players..."
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {filtered.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded border border-gray-200 bg-white shadow-sm">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-gray-50"
            >
              <span>
                {p.name}
                {p.is_goalie && (
                  <span className="ml-1.5 text-xs text-gray-400">(G)</span>
                )}
              </span>
              <button
                onClick={() => handleAdd(p)}
                className="ml-2 rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && filtered.length === 0 && alreadyOnTeam.length > 0 && (
        <p className="text-xs text-gray-400">
          {alreadyOnTeam.map((p) => p.name).join(', ')} already on this team
        </p>
      )}
      {query.trim() && filtered.length === 0 && alreadyOnTeam.length === 0 && allPlayers.length > 0 && (
        <p className="text-xs text-gray-400">No matching players found ({allPlayers.length} total in system)</p>
      )}
      {query.trim() && allPlayers.length === 0 && !error && (
        <p className="text-xs text-gray-400">No players in system yet</p>
      )}
    </div>
  );
}
