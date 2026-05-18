'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { RosterPlayer, SlotRef } from '@/lib/types';

interface PlayerChipProps {
  player: RosterPlayer;
  fromSlot?: SlotRef;
  readOnly?: boolean;
  onRemove?: () => void;
  isOverlay?: boolean;
  preferenceClass?: string;
}

export function PlayerChip({ player, fromSlot, readOnly, onRemove, isOverlay, preferenceClass }: PlayerChipProps) {
  const draggableId = fromSlot
    ? `slot-${fromSlot.slotId}-${fromSlot.position}-${player.id}`
    : `roster-overlay-${player.id}`;

  const inactive = !player.is_active;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: fromSlot
      ? { type: 'slot-player', playerId: player.id, fromSlot }
      : { type: 'roster-player', playerId: player.id },
    disabled: readOnly || isOverlay || inactive,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? style : undefined}
      className={`flex items-center justify-between gap-1 rounded px-2 py-1.5 text-sm font-medium border shadow-sm w-full ${
        inactive ? 'bg-gray-50 border-gray-200 opacity-60' : (preferenceClass ?? 'bg-white border-gray-300')
      } ${isDragging ? 'opacity-30' : ''} ${
        !readOnly && !isOverlay && !inactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isOverlay ? 'shadow-lg' : ''}`}
      {...(!readOnly && !isOverlay && !inactive ? { ...listeners, ...attributes } : {})}
    >
      <span className={`truncate ${inactive ? 'line-through text-gray-400' : ''}`}>
        {player.name}
        {inactive && <span className="ml-1.5 no-underline not-italic text-gray-400">(inactive)</span>}
      </span>
      {!readOnly && onRemove && !isOverlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 text-gray-400 hover:text-red-500 leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
