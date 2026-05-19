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

const nameClamp: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
};

export function PlayerChip({ player, fromSlot, readOnly, onRemove, isOverlay, preferenceClass }: PlayerChipProps) {
  const { isTouchDevice, isEditMode, selectedPlayerId, setSelectedPlayerId } = useDragState();

  const draggableId = fromSlot
    ? `slot-${fromSlot.slotId}-${fromSlot.position}-${player.id}`
    : `roster-overlay-${player.id}`;

  const inactive = !player.is_active;
  const isInSlot = !!fromSlot && !isOverlay;
  const isSelected = selectedPlayerId === player.id;

  // Drag is disabled on touch devices — tap-to-place handles placement instead.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: fromSlot
      ? { type: 'slot-player', playerId: player.id, fromSlot }
      : { type: 'roster-player', playerId: player.id },
    disabled: readOnly || isOverlay || inactive || isTouchDevice,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const isMobileMinimal = isTouchDevice && !isEditMode && isInSlot && !inactive;
  const isMobileEditSlot = isTouchDevice && isEditMode && isInSlot && !isOverlay;

  const showRemove = onRemove && !readOnly && !isOverlay && (!isTouchDevice || isEditMode);
  const showDotGrid = isTouchDevice && isEditMode && isInSlot && !player.is_goalie;

  const borderedClass = inactive
    ? 'bg-gray-50 border-gray-200 opacity-60'
    : (preferenceClass ?? 'bg-white border-gray-300');

  // ── Mobile minimal: borderless text only ─────────────────────────────
  if (isMobileMinimal) {
    return (
      <div
        className="slot-tile w-full px-1 py-0.5 select-none"
      >
        <p className="text-xs font-medium leading-tight text-gray-800 text-center" style={nameClamp}>
          {player.name}
        </p>
      </div>
    );
  }

  // ── Mobile edit mode: centered avatar-style card + iOS badge ×  ──────
  if (isMobileEditSlot) {
    // Click handler: select/deselect this player.
    // If a *different* player is already selected, let the event bubble to the
    // parent PositionSlot, which will call onTapSlot() to place the selection here.
    function handleChipClick(e: React.MouseEvent) {
      if (!isEditMode) return;
      if (selectedPlayerId && selectedPlayerId !== player.id) return; // bubble to slot
      e.stopPropagation();
      setSelectedPlayerId(isSelected ? null : player.id);
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={handleChipClick}
        className={`slot-tile relative flex flex-col items-center rounded-lg border-2 px-2 py-1.5 shadow-sm w-full select-none cursor-pointer transition-all ${borderedClass} ${
          isDragging ? 'opacity-30' : ''
        } ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
      >
        {/* iOS-style circular badge — overflows top-right corner */}
        {showRemove && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove!(); }}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-base font-bold shadow-md z-10 select-none"
            style={{ lineHeight: 1 }}
          >
            ×
          </button>
        )}
        {/* Centered name — matches AvatarTile style */}
        <p
          className="text-xs font-medium leading-tight text-center w-full mt-0.5"
          style={nameClamp}
        >
          {player.name}
        </p>
        {showDotGrid && <PositionDotGrid positions={player.positions} />}
      </div>
    );
  }

  // ── Desktop / overlay: horizontal layout with inline × ───────────────
  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? style : undefined}
      className={`slot-tile flex flex-col gap-0.5 rounded-lg border-2 px-2 py-1.5 text-sm font-medium shadow-sm w-full select-none ${borderedClass} ${
        isDragging ? 'opacity-30' : ''
      } ${!readOnly && !isOverlay && !inactive ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isOverlay ? 'shadow-lg' : ''
      }`}
      {...(!readOnly && !isOverlay && !inactive ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className={`text-xs font-medium leading-tight flex-1 ${inactive ? 'line-through text-gray-400' : ''}`}
          style={nameClamp}
        >
          {player.name}
          {inactive && <span className="ml-1 no-underline not-italic text-gray-400">(inactive)</span>}
        </p>
        {showRemove && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove!(); }}
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
