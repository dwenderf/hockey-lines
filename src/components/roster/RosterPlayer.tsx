'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FORWARD_POSITIONS, DEFENSE_POSITIONS } from '@/lib/constants';
import { PositionBadge } from '@/components/preferences/PositionBadge';
import { Button } from '@/components/ui/Button';
import type { Player } from '@/lib/types';

interface RosterPlayerProps {
  player: Player;
  isAssigned: boolean;
  readOnly?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}

export function RosterPlayer({ player, isAssigned, readOnly, onEdit, onRemove }: RosterPlayerProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster-player', playerId: player.id },
    disabled: isAssigned || readOnly,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const positions = [...FORWARD_POSITIONS, ...DEFENSE_POSITIONS];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border p-2 text-sm transition-opacity ${
        isAssigned ? 'opacity-40' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'opacity-50 shadow-lg' : 'bg-white hover:bg-gray-50'} border-gray-200`}
      {...(!isAssigned && !readOnly ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-medium text-gray-900 truncate">{player.name}</span>
          {player.is_goalie && (
            <span className="shrink-0 rounded bg-yellow-100 px-1 text-xs text-yellow-700">G</span>
          )}
        </div>
        {!player.is_goalie && (
          <div className="mt-1 flex flex-wrap gap-1">
            {positions.map((pos) => {
              const pref = player.positions[pos];
              if (!pref) return null;
              return <PositionBadge key={pos} position={pos} preference={pref} />;
            })}
          </div>
        )}
      </div>
      {!readOnly && (
        <div className="flex shrink-0 gap-1">
          {onEdit && (
            <Button variant="ghost" className="px-1.5 py-0.5 text-xs" onClick={onEdit}>
              Pos
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" className="px-1.5 py-0.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onRemove}>
              ×
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
