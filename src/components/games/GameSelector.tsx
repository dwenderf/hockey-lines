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
  if (games.length === 0) return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No games yet</span>;

  const selectedGame = games.find((g) => g.id === selectedGameId);

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedGameId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border)',
        }}
        className="rounded border px-3 py-1.5 text-sm focus:outline-none"
      >
        {games.map((g) => (
          <option key={g.id} value={g.id}>
            {formatGame(g)}
          </option>
        ))}
      </select>
    </div>
  );
}
