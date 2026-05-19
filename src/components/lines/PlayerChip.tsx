'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDragState } from '@/hooks/useDragState';
import { PositionDotGrid } from './PositionDotGrid';
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
  const { isTouchDevice, isEditMode } = useDragState();

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

  // On desktop: always show remove. On touch: only in edit mode.
  const showRemove = onRemove && !readOnly && !isOverlay && (!isTouchDevice || isEditMode);

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? style : undefined}
      className={`flex flex-col gap-0.5 rounded px-2 py-1.5 text-sm font-medium border shadow-sm w-full ${
        inactive ? 'bg-gray-50 border-gray-200 opacity-60' : (preferenceClass ?? 'bg-white border-gray-300')
      } ${isDragging ? 'opacity-30' : ''} ${
        !readOnly && !isOverlay && !inactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isOverlay ? 'shadow-lg' : ''}`}
      {...(!readOnly && !isOverlay && !inactive ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`truncate ${inactive ? 'line-through text-gray-400' : ''}`}>
          {player.name}
          {inactive && <span className="ml-1.5 no-underline not-italic text-gray-400">(inactive)</span>}
        </span>
        {showRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove!();
            }}
            className="shrink-0 text-gray-400 hover:text-red-500 leading-none"
          >
            ×
          </button>
        )}
      </div>
      {isTouchDevice && isEditMode && !isOverlay && !player.is_goalie && (
        <PositionDotGrid positions={player.positions} />
      )}
    </div>
  );
}
