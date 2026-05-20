'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FORWARD_POSITIONS, DEFENSE_POSITIONS } from '@/lib/constants';
import { PositionBadge } from '@/components/preferences/PositionBadge';
import type { RosterPlayer } from '@/lib/types';

interface RosterPlayerProps {
  player: RosterPlayer;
  isAssigned: boolean;
  isAbsent?: boolean;
  readOnly?: boolean;
  onEdit?: () => void;
}

export function RosterPlayer({ player, isAssigned, isAbsent, readOnly, onEdit }: RosterPlayerProps) {
  const inactive = !player.is_active;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
    disabled: isAssigned || readOnly,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const positions = [...FORWARD_POSITIONS, ...DEFENSE_POSITIONS];
  const showPositions = !player.is_goalie && !inactive && !isAbsent;

  const handleClick = () => {
    if (!readOnly && !inactive && !isAbsent && onEdit) {
      onEdit();
    }
  };

  const cardStyle: React.CSSProperties = inactive
    ? { opacity: 0.5, backgroundColor: 'var(--bg-page)', borderColor: 'var(--border)' }
    : isAbsent
    ? { opacity: 0.6, backgroundColor: 'var(--bg-page)', borderColor: 'var(--border)' }
    : isAssigned
    ? { opacity: 0.4, backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }
    : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...cardStyle }}
      onClick={handleClick}
      className={`flex flex-col rounded-lg border p-2 text-sm transition-opacity ${
        inactive || isAssigned ? '' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-30 shadow-lg' : ''} ${showPositions && onEdit && !readOnly ? 'cursor-pointer' : ''}`}
      {...(!isAssigned && !readOnly ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`font-medium truncate flex-1 ${inactive ? 'line-through' : ''}`}
          style={{ color: inactive ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {player.display_name || player.name}
        </span>
        {player.is_goalie && (
          <span className="shrink-0 rounded bg-yellow-100 px-1 text-xs text-yellow-700">G</span>
        )}
        {inactive && (
          <span className="shrink-0 rounded px-1 text-xs" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
            Inactive
          </span>
        )}
      </div>

      {showPositions && (
        <div className="mt-1 flex items-center gap-1">
          {positions.map((pos) => (
            <PositionBadge
              key={pos}
              position={pos}
              preference={player.positions[pos] ?? 'unset'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
