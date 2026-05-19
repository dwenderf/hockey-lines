import { PositionSlot } from './PositionSlot';
import type { RosterPlayer, Position, SlotRef } from '@/lib/types';

interface SlotDef {
  position: Position;
  slotId: string;
  column: string;
  table: 'forward_line_slots' | 'defense_line_slots';
  playerId: string | null;
}

interface LineRowProps {
  slots: SlotDef[];
  playersById: Map<string, RosterPlayer>;
  readOnly?: boolean;
  onRemoveFromSlot?: (slotRef: SlotRef) => void;
  onTapSlot?: (slotRef: SlotRef) => void;
}

export function LineRow({ slots, playersById, readOnly, onRemoveFromSlot, onTapSlot }: LineRowProps) {
  return (
    <div className="flex items-center gap-2">
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
            onTapSlot={onTapSlot ? () => onTapSlot(slotRef) : undefined}
          />
        );
      })}
    </div>
  );
}
