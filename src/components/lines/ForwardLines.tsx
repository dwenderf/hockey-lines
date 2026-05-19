import { LineRow } from './LineRow';
import { Button } from '@/components/ui/Button';
import type { RosterPlayer, ForwardLineSlot, SlotRef } from '@/lib/types';
import { FORWARD_POSITIONS, POSITION_TO_COLUMN } from '@/lib/constants';

interface ForwardLinesProps {
  slots: ForwardLineSlot[];
  playersById: Map<string, RosterPlayer>;
  readOnly?: boolean;
  onRemoveFromSlot?: (slotRef: SlotRef) => void;
  onAddLine?: () => void;
  onTapSlot?: (slotRef: SlotRef) => void;
}

export function ForwardLines({ slots, playersById, readOnly, onRemoveFromSlot, onAddLine, onTapSlot }: ForwardLinesProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {FORWARD_POSITIONS.map((pos) => (
          <div key={pos} className="flex-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
            {pos}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {slots.map((slot) => (
          <LineRow
            key={slot.id}
            playersById={playersById}
            readOnly={readOnly}
            onRemoveFromSlot={onRemoveFromSlot}
            onTapSlot={onTapSlot}
            slots={FORWARD_POSITIONS.map((pos) => ({
              position: pos,
              slotId: slot.id,
              column: POSITION_TO_COLUMN[pos],
              table: 'forward_line_slots' as const,
              playerId: slot[POSITION_TO_COLUMN[pos] as keyof ForwardLineSlot] as string | null,
            }))}
          />
        ))}
      </div>
      {!readOnly && onAddLine && slots.length < 4 && (
        <button
          onClick={onAddLine}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700"
        >
          + Add line {slots.length + 1}
        </button>
      )}
    </div>
  );
}
