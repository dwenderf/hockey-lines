import { PositionSlot } from './PositionSlot';
import type { Player, Position, SlotRef } from '@/lib/types';

interface SlotDef {
  position: Position;
  slotId: string;
  column: string;
  table: 'forward_line_slots' | 'defense_line_slots';
  playerId: string | null;
}

interface LineRowProps {
  lineNumber: number;
  slots: SlotDef[];
  playersById: Map<string, Player>;
  readOnly?: boolean;
  onRemoveFromSlot?: (slotRef: SlotRef) => void;
}

export function LineRow({ lineNumber, slots, playersById, readOnly, onRemoveFromSlot }: LineRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-400">{lineNumber}</span>
      {slots.map((s) => {
        const slotRef: SlotRef = { table: s.table, slotId: s.slotId, column: s.column, position: s.position };
        return (
          <PositionSlot
            key={s.position}
            slotRef={slotRef}
            player={s.playerId ? (playersById.get(s.playerId) ?? null) : null}
            playersById={playersById}
            readOnly={readOnly}
            onRemove={onRemoveFromSlot ? () => onRemoveFromSlot(slotRef) : undefined}
          />
        );
      })}
    </div>
  );
}
