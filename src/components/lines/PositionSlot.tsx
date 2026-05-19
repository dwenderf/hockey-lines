'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import { PlayerChip } from './PlayerChip';
import { SLOT_DRAG_COLORS, getChipClass } from '@/lib/constants';
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

  // ── Valid-target detection ───────────────────────────────────────────
  // A slot is a valid target when the selected player has a preferred or
  // acceptable fit here AND it isn't their own current slot.
  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;
  const highlightPref = selectedPlayer?.positions[slotRef.position];
  const isValidTarget =
    !readOnly &&
    isEditMode &&
    !!selectedPlayerId &&
    selectedPlayerId !== player?.id &&
    (highlightPref === 'preferred' || highlightPref === 'acceptable');

  // Valid-target pulse color matches slot TYPE, not preference tier:
  //   defense slots (LD/RD) → blue pulse, forward slots → green pulse
  const isDefenseSlot = slotRef.position === 'LD' || slotRef.position === 'RD';
  const validTargetBorder = isDefenseSlot
    ? 'border-2 border-blue-400 border-dashed bg-blue-50 animate-pulse cursor-pointer'
    : 'border-2 border-green-400 border-dashed bg-green-50 animate-pulse cursor-pointer';

  function handleClick(e: React.MouseEvent) {
    if (readOnly) return;
    if (isEditMode && selectedPlayerId && onTapSlot) {
      e.stopPropagation();
      onTapSlot();
    }
  }

  // ── Desktop drag colors (desktop only — no activeDragPlayerId on touch) ─
  let dragColorClass = '';
  if (activeDragPlayerId && !readOnly && !draggingAbsent) {
    const activePlayer = playersById.get(activeDragPlayerId);
    if (activePlayer?.is_active) {
      const pref: Preference = activePlayer.positions[slotRef.position] ?? 'unset';
      dragColorClass = SLOT_DRAG_COLORS[pref];
    }
  }

  // ── Slot border priority ─────────────────────────────────────────────
  // 1. Valid tap target (selected player fits here) → colored pulsing dashed border
  // 2. Drag hover → scale + color ring
  // 3. Active drag, not hovering → color ring only
  // 4. Occupied, no special state → border-0 (chip is the only visual element)
  // 5. Empty, no special state → muted dashed gray
  const specialState = isOver || !!dragColorClass;
  const slotBorder = isValidTarget
    ? validTargetBorder
    : isOver
    ? `border-2 border-gray-300 scale-105 ${dragColorClass || 'bg-gray-50'}`
    : dragColorClass
    ? `border-0 ${dragColorClass}`
    : player
    ? 'border-0 bg-transparent'
    : 'border-2 border-dashed border-gray-200 bg-white';

  // p-0 on occupied slots with no special state so chip fills cleanly.
  const outerPad = (player && !specialState && !isValidTarget) ? 'p-0' : 'p-1';

  // On touch, empty slots match the fixed chip height so rows stay uniform.
  const minH = isTouchDevice ? 'min-h-[76px]' : 'min-h-[3rem]';

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`relative flex ${minH} min-w-0 w-full items-center rounded-md transition-all ${outerPad} ${slotBorder}`}
    >
      {player ? (
        <PlayerChip
          player={player}
          fromSlot={slotRef}
          readOnly={readOnly}
          onRemove={onRemove}
          preferenceClass={
            player.is_active
              ? getChipClass(player.positions[slotRef.position] ?? 'unset', slotRef.position)
              : undefined
          }
        />
      ) : (
        <span className="w-full text-center text-xs text-gray-300 select-none">—</span>
      )}
    </div>
  );
}
