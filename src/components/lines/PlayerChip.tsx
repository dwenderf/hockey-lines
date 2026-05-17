'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Player, SlotRef } from '@/lib/types';

interface PlayerChipProps {
  player: Player;
  fromSlot?: SlotRef;
  readOnly?: boolean;
  onRemove?: () => void;
  isOverlay?: boolean;
}

export function PlayerChip({ player, fromSlot, readOnly, onRemove, isOverlay }: PlayerChipProps) {
  const draggableId = fromSlot
    ? `slot-${fromSlot.slotId}-${fromSlot.position}-${player.id}`
    : `roster-overlay-${player.id}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: fromSlot
      ? { type: 'slot-player', playerId: player.id, fromSlot }
      : { type: 'roster-player', playerId: player.id },
    disabled: readOnly || isOverlay,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? style : undefined}
      className={`flex items-center justify-between gap-1 rounded px-2 py-1 text-xs font-medium bg-white border border-gray-300 shadow-sm w-full ${
        isDragging ? 'opacity-30' : ''
      } ${!readOnly && !isOverlay ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isOverlay ? 'shadow-lg border-blue-400' : ''
      }`}
      {...(!readOnly && !isOverlay ? { ...listeners, ...attributes } : {})}
    >
      <span className="truncate">{player.name}</span>
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
