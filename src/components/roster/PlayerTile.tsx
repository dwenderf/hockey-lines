'use client';

import { PositionBadge } from '@/components/preferences/PositionBadge';
import { FORWARD_POSITIONS, DEFENSE_POSITIONS } from '@/lib/constants';
import type { RosterPlayer } from '@/lib/types';

interface PlayerTileProps {
  player: RosterPlayer;
  isCaptain: boolean;
  onClick?: () => void;
}

function SkillDots({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex gap-1 items-center">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <span
          key={n}
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: n <= level ? 'var(--accent)' : 'var(--dot-unset)' }}
        />
      ))}
    </div>
  );
}

export function PlayerTile({ player, isCaptain, onClick }: PlayerTileProps) {
  const isInactive = !player.is_active;
  const displayName = [
    player.jersey_number ? `#${player.jersey_number}` : null,
    player.display_name,
  ]
    .filter(Boolean)
    .join(' ');

  const allPositions = [...FORWARD_POSITIONS, ...DEFENSE_POSITIONS];

  const content = (
    <div
      className="rounded-lg border px-4 py-3 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        opacity: isInactive ? 0.6 : 1,
      }}
    >
      {/* Top row: name + status + chevron */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {displayName}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isInactive ? (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--bench)', color: 'var(--text-secondary)' }}
            >
              Inactive
            </span>
          ) : (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--pill-published-bg)', color: 'var(--pill-published-text)' }}
            >
              Active
            </span>
          )}
          {isCaptain && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>›</span>
          )}
        </div>
      </div>

      {/* Bottom row: position pills + skill dots */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {allPositions.map((pos) => (
            <PositionBadge
              key={pos}
              position={pos}
              preference={player.positions[pos] ?? 'unset'}
            />
          ))}
        </div>
        {isCaptain && player.player_level !== null && (
          <SkillDots level={player.player_level} />
        )}
      </div>
    </div>
  );

  if (isCaptain && onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}
