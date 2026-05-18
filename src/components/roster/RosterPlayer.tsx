'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FORWARD_POSITIONS, DEFENSE_POSITIONS } from '@/lib/constants';
import { PositionBadge } from '@/components/preferences/PositionBadge';
import { Button } from '@/components/ui/Button';
import type { RosterPlayer } from '@/lib/types';

interface RosterPlayerProps {
  player: RosterPlayer;
  isAssigned: boolean;
  isAbsent?: boolean;
  readOnly?: boolean;
  onEdit?: () => void;
  onMarkAbsent?: () => void;
  onMarkAvailable?: () => void;
}

export function RosterPlayer({ player, isAssigned, isAbsent, readOnly, onEdit, onMarkAbsent, onMarkAvailable }: RosterPlayerProps) {
  const inactive = !player.is_active;
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
        inactive
          ? 'opacity-50 bg-gray-50 border-gray-200 cursor-grab active:cursor-grabbing'
          : isAbsent
          ? 'opacity-60 bg-amber-50 border-amber-200 cursor-grab active:cursor-grabbing'
          : isAssigned
          ? 'opacity-40 bg-white border-gray-200'
          : 'cursor-grab active:cursor-grabbing bg-white hover:bg-gray-50 border-gray-200'
      } ${isDragging ? 'opacity-30 shadow-lg' : ''}`}
      {...(!isAssigned && !readOnly ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className={`font-medium truncate ${inactive ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {player.name}
          </span>
          {player.is_goalie && (
            <span className="shrink-0 rounded bg-yellow-100 px-1 text-xs text-yellow-700">G</span>
          )}
          {inactive && (
            <span className="shrink-0 rounded bg-gray-100 px-1 text-xs text-gray-400">Inactive</span>
          )}
          {isAbsent && (
            <span className="shrink-0 rounded bg-amber-100 px-1 text-xs text-amber-700">Out</span>
          )}
        </div>
        {!player.is_goalie && !inactive && !isAbsent && (
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
          {isAbsent ? (
            onMarkAvailable && (
              <Button
                variant="ghost"
                className="px-1.5 py-0.5 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
                onClick={onMarkAvailable}
              >
                Back
              </Button>
            )
          ) : !inactive ? (
            <>
              {onEdit && (
                <Button variant="ghost" className="px-1.5 py-0.5 text-xs" onClick={onEdit}>
                  Pos
                </Button>
              )}
              {onMarkAbsent && (
                <Button
                  variant="ghost"
                  className="px-1.5 py-0.5 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                  onClick={onMarkAbsent}
                >
                  Out
                </Button>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
