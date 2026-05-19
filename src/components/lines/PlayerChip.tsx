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

const nameStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
};

export function PlayerChip({ player, fromSlot, readOnly, onRemove, isOverlay, preferenceClass }: PlayerChipProps) {
  const { isTouchDevice, isEditMode } = useDragState();

  const draggableId = fromSlot
    ? `slot-${fromSlot.slotId}-${fromSlot.position}-${player.id}`
    : `roster-overlay-${player.id}`;

  const inactive = !player.is_active;
  const isInSlot = !!fromSlot && !isOverlay;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: fromSlot
      ? { type: 'slot-player', playerId: player.id, fromSlot }
      : { type: 'roster-player', playerId: player.id },
    disabled: readOnly || isOverlay || inactive,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  // Mobile "minimal" = in a slot, touch device, not in edit mode, not inactive, not overlay
  const isMobileMinimal = isTouchDevice && !isEditMode && isInSlot && !inactive;

  // On desktop: always show remove. On touch: only in edit mode.
  const showRemove = onRemove && !readOnly && !isOverlay && (!isTouchDevice || isEditMode);

  // Show dot grid: touch + edit mode + in a slot + not goalie
  const showDotGrid = isTouchDevice && isEditMode && isInSlot && !player.is_goalie;

  // Bordered card style — used on desktop always, and on mobile in edit mode / overlay
  const borderedClass = inactive
    ? 'bg-gray-50 border-gray-200 opacity-60'
    : (preferenceClass ?? 'bg-white border-gray-300');

  if (isMobileMinimal) {
    // Clean, borderless, text-only — just enough to read the name in the slot
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`slot-tile w-full px-1 py-0.5 select-none ${isDragging ? 'opacity-30' : ''} ${
          !readOnly && !inactive ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        {...(!readOnly && !inactive ? { ...listeners, ...attributes } : {})}
      >
        <p
          className="text-xs font-medium leading-tight text-gray-800 text-center"
          style={nameStyle}
        >
          {player.name}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? style : undefined}
      className={`slot-tile flex flex-col gap-0.5 rounded-lg border-2 px-2 py-1.5 text-sm font-medium shadow-sm w-full select-none ${borderedClass} ${
        isDragging ? 'opacity-30' : ''
      } ${
        !readOnly && !isOverlay && !inactive ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isOverlay ? 'shadow-lg' : ''}`}
      {...(!readOnly && !isOverlay && !inactive ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className={`text-xs font-medium leading-tight flex-1 ${inactive ? 'line-through text-gray-400' : ''}`}
          style={nameStyle}
        >
          {player.name}
          {inactive && <span className="ml-1 no-underline not-italic text-gray-400">(inactive)</span>}
        </p>
        {showRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove!();
            }}
            className="shrink-0 text-gray-400 hover:text-red-500 leading-none mt-0.5"
          >
            ×
          </button>
        )}
      </div>
      {showDotGrid && <PositionDotGrid positions={player.positions} />}
    </div>
  );
}
