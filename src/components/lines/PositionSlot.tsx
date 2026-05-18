'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from '@/hooks/useDragState';
import { PlayerChip } from './PlayerChip';
import { SLOT_DRAG_COLORS } from '@/lib/constants';
import type { RosterPlayer, SlotRef, Preference } from '@/lib/types';

interface PositionSlotProps {
  slotRef: SlotRef;
  player: RosterPlayer | null;
  readOnly?: boolean;
  playersById: Map<string, RosterPlayer>;
  onRemove?: () => void;
}

export function PositionSlot({ slotRef, player, readOnly, playersById, onRemove }: PositionSlotProps) {
  const { activeDragPlayerId, absentPlayerIds } = useDragState();

  const draggingAbsent = activeDragPlayerId ? absentPlayerIds.has(activeDragPlayerId) : false;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotRef.slotId}-${slotRef.position}`,
    data: { type: 'slot', slotRef },
    disabled: readOnly || draggingAbsent,
  });

  let dragColorClass = '';
  if (activeDragPlayerId && !readOnly && !isOver && !draggingAbsent) {
    const activePlayer = playersById.get(activeDragPlayerId);
    if (activePlayer?.is_active) {
      const pref: Preference = activePlayer.positions[slotRef.position] ?? 'unset';
      dragColorClass = SLOT_DRAG_COLORS[pref];
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-[2.5rem] min-w-0 flex-1 items-center rounded-md border-2 p-1 transition-all ${
        isOver
          ? 'border-blue-400 bg-blue-50 scale-105'
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
        />
      ) : (
        <span className="w-full text-center text-xs text-gray-300 select-none">—</span>
      )}
    </div>
  );
}
