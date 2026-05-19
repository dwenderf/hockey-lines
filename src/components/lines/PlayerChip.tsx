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

// Height shared by mobile slot chips and carousel tiles.
const MOBILE_TILE_HEIGHT = 76;

/** Split a full name at the first space so it always renders on two lines. */
function splitName(name: string): [string, string] {
  const i = name.indexOf(' ');
  return i === -1 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
}

export function PlayerChip({ player, fromSlot, readOnly, onRemove, isOverlay, preferenceClass }: PlayerChipProps) {
  const { isTouchDevice, isEditMode, setEditMode, selectedPlayerId, setSelectedPlayerId } = useDragState();

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

  // Desktop: always show ×. Touch: only show × on the currently-selected chip.
  const showRemove = onRemove && !readOnly && !isOverlay && (!isTouchDevice || (isEditMode && isSelected));

  // When selected, suppress position-fit color so the × badge is the sole selection signal.
  const borderedClass = inactive
    ? 'bg-gray-50 border-gray-200 opacity-60'
    : isSelected
    ? 'bg-white border-gray-700'
    : (preferenceClass ?? 'bg-white border-gray-300');

  // ── Mobile slot chip (normal + edit mode unified) ─────────────────────
  // Fixed height matches the carousel tile. Position-fit border always visible.
  // Dot grid space pre-allocated — opacity controls visibility to prevent layout shifts.
  if (isTouchDevice && isInSlot && !isOverlay) {
    const [firstName, lastName] = splitName(player.name);

    function handleTileTap(e: React.MouseEvent) {
      if (inactive) return;
      // If a *different* player is selected, let the event bubble to PositionSlot
      // which will call onTapSlot() to place the selection here (swap or fill).
      if (selectedPlayerId && selectedPlayerId !== player.id) return;
      e.stopPropagation();
      setEditMode(true);
      setSelectedPlayerId(isSelected ? null : player.id);
    }

    return (
      <div
        onClick={handleTileTap}
        className={`slot-tile relative flex flex-col items-center justify-center rounded-lg border-2 px-1.5 py-1 w-full select-none transition-all ${borderedClass} ${
          inactive ? '' : 'cursor-pointer'
        }`}
        style={{ height: `${MOBILE_TILE_HEIGHT}px` }}
      >
        {/* iOS-style × badge — only on selected chip in edit mode */}
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

        {/* Name — forced two-line layout matching carousel tiles */}
        <p className="text-xs font-medium leading-tight text-center w-full" style={{ wordBreak: 'break-word' }}>
          {firstName}
          {lastName && <><br />{lastName}</>}
        </p>

        {/* Dot grid — always reserves its space; opacity toggles in edit mode.
            Goalies kept invisible always (no position slots to evaluate). */}
        <div
          className={`transition-opacity duration-150 ${
            isEditMode && !player.is_goalie ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <PositionDotGrid positions={player.positions} />
        </div>
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
    </div>
  );
}
