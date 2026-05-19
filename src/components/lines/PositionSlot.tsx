'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import { useLongPress } from '@/hooks/useLongPress';
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
  const { activeDragPlayerId, absentPlayerIds, isTouchDevice, isEditMode, setEditMode, selectedPlayerId } = useDragState();

  const draggingAbsent = activeDragPlayerId ? absentPlayerIds.has(activeDragPlayerId) : false;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotRef.slotId}-${slotRef.position}`,
    data: { type: 'slot', slotRef },
    disabled: readOnly || draggingAbsent,
  });

  const longPress = useLongPress({ onLongPress: () => setEditMode(true) });

  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;
  const highlightPref = selectedPlayer?.positions[slotRef.position];
  const isHighlighted =
    !readOnly &&
    isEditMode &&
    !!selectedPlayerId &&
    !player &&
    (highlightPref === 'preferred' || highlightPref === 'acceptable');

  function handleClick(e: React.MouseEvent) {
    if (readOnly) return;
    if (isEditMode && !player && selectedPlayerId && onTapSlot) {
      e.stopPropagation();
      onTapSlot();
    }
  }

  let dragColorClass = '';
  if (activeDragPlayerId && !readOnly && !draggingAbsent) {
    const activePlayer = playersById.get(activeDragPlayerId);
    if (activePlayer?.is_active) {
      const pref: Preference = activePlayer.positions[slotRef.position] ?? 'unset';
      dragColorClass = SLOT_DRAG_COLORS[pref];
    }
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      {...(isTouchDevice && !readOnly ? longPress : {})}
      className={`relative flex min-h-[3rem] min-w-0 flex-1 items-center rounded-md border-2 p-1 transition-all ${
        isHighlighted
          ? 'border-green-400 bg-green-50 animate-pulse cursor-pointer'
          : isOver
          ? `scale-105 ${dragColorClass || 'border-gray-300 bg-gray-50'}`
          : player
          ? 'border-gray-200 bg-gray-50'
          : dragColorClass || 'border-dashed border-gray-200 bg-white'
      }`}
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
