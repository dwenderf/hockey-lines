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

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [playersRes, rostersRes] = await Promise.all([
      supabase.from('players').select('id, name, is_goalie').order('name'),
      supabase.from('rosters').select('player_id').eq('team_id', teamId).eq('is_active', true),
    ]);
    if (playersRes.data) setAllPlayers(playersRes.data);
    if (rostersRes.data) setTeamPlayerIds(new Set(rostersRes.data.map((r) => r.player_id)));
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = query.trim()
    ? allPlayers.filter(
        (p) =>
          !teamPlayerIds.has(p.id) &&
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
      {query.trim() && filtered.length === 0 && (
        <p className="text-xs text-gray-400">No matching players not already on this team</p>
      )}
    </div>
  );
}
