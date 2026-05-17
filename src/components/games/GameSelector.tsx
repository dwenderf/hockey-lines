'use client';

import type { Game } from '@/lib/types';

interface GameSelectorProps {
  games: Game[];
  selectedGameId: string | null;
  onSelect: (gameId: string) => void;
}

function formatGame(game: Game): string {
  const date = new Date(game.starts_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${game.is_home ? 'vs' : '@'} ${game.opponent} — ${date}`;
}

export function GameSelector({ games, selectedGameId, onSelect }: GameSelectorProps) {
  if (games.length === 0) return <span className="text-sm text-gray-400">No games yet</span>;

  return (
    <select
      value={selectedGameId ?? ''}
      onChange={(e) => onSelect(e.target.value)}
      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
    >
      {games.map((g) => (
        <option key={g.id} value={g.id}>
          {formatGame(g)}
        </option>
      ))}
    </select>
  );
}
