'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import { PlayerChip } from './PlayerChip';
import { SLOT_DRAG_COLORS, CHIP_PREFERENCE_COLORS } from '@/lib/constants';
import type { RosterPlayer, SlotRef, Preference } from '@/lib/types';

interface PositionSlotProps {
  slotRef: SlotRef;
  player: RosterPlayer | null;
  readOnly?: boolean;
  playersById: Map<string, RosterPlayer>;
  onRemove?: () => void;
  onTapSlot?: () => void;
}

export function PositionSlot({ slotRef, player, readOnly, playersById, onRemove, onTapSlot }: PositionSlotProps) {
  const { activeDragPlayerId, absentPlayerIds, isTouchDevice, isEditMode, selectedPlayerId } = useDragState();

  const draggingAbsent = activeDragPlayerId ? absentPlayerIds.has(activeDragPlayerId) : false;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotRef.slotId}-${slotRef.position}`,
    data: { type: 'slot', slotRef },
    disabled: readOnly || draggingAbsent,
  });

  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;
  const highlightPref = selectedPlayer?.positions[slotRef.position];
  // Highlight empty slots that are compatible with the selected player.
  // Occupied slots don't pulse but are still tappable (click bubbles from the chip).
  const isHighlighted =
    !readOnly &&
    isEditMode &&
    !!selectedPlayerId &&
    selectedPlayerId !== player?.id &&  // don't highlight the slot the selected player is already in
    !player &&
    (highlightPref === 'preferred' || highlightPref === 'acceptable');

  function handleClick(e: React.MouseEvent) {
    if (readOnly) return;
    // Place the selected player into this slot (works for empty OR occupied slots).
    // The PlayerChip inside an occupied slot bubbles the event up when a *different*
    // player is selected, so we naturally reach here only in that case.
    if (isEditMode && selectedPlayerId && onTapSlot) {
      e.stopPropagation();
      onTapSlot();
    }
  }

  // Compute drag color for this slot based on the dragged player's preference.
  // Applied to ALL slots (occupied and empty) so the captain can instantly see fit.
  let dragColorClass = '';
  if (activeDragPlayerId && !readOnly && !draggingAbsent) {
    const activePlayer = playersById.get(activeDragPlayerId);
    if (activePlayer?.is_active) {
      const pref: Preference = activePlayer.positions[slotRef.position] ?? 'unset';
      dragColorClass = SLOT_DRAG_COLORS[pref];
    }
  }

  // When occupied and not in a special drag/highlight state, strip the outer frame so
  // the chip fills the slot boundary cleanly (no "tile inside a box" nesting).
  const specialState = isHighlighted || isOver || !!dragColorClass;
  const slotClass = isHighlighted
    ? 'border-green-400 bg-green-50 animate-pulse cursor-pointer'
    : isOver
    ? `scale-105 ${dragColorClass || 'border-gray-300 bg-gray-50'}`
    : dragColorClass        // ← all slots color-coded during a drag
    ? dragColorClass
    : player
    ? 'border-transparent bg-transparent'  // chip fills the slot; no outer frame
    : 'border-dashed border-gray-200 bg-white';

  const outerPad = player && !specialState ? 'p-0' : 'p-1';

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`relative flex min-h-[3rem] min-w-0 flex-1 items-center rounded-md border-2 transition-all ${outerPad} ${slotClass}`}
    >
      {player ? (
        <PlayerChip
          player={player}
          fromSlot={slotRef}
          readOnly={readOnly}
          onRemove={onRemove}
          preferenceClass={player.is_active ? CHIP_PREFERENCE_COLORS[player.positions[slotRef.position] ?? 'unset'] : undefined}
        />
      ) : (
        <span className="w-full text-center text-xs text-gray-300 select-none">—</span>
      )}
    </div>
  );
}
