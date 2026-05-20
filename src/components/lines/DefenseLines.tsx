import { PositionSlot } from './PositionSlot';
import type { RosterPlayer, DefenseLineSlot, SlotRef } from '@/lib/types';
import { DEFENSE_POSITIONS, POSITION_TO_COLUMN } from '@/lib/constants';

// Defense uses a 4-track grid so the two slots sit under the wings of the
// forward rows:  1fr [LD 2fr] [RD 2fr] 1fr
const DEFENSE_GRID = '[grid-template-columns:1fr_2fr_2fr_1fr]';

interface DefenseLinesProps {
  slots: DefenseLineSlot[];
  playersById: Map<string, RosterPlayer>;
  readOnly?: boolean;
  onRemoveFromSlot?: (slotRef: SlotRef) => void;
  onAddLine?: () => void;
  onTapSlot?: (slotRef: SlotRef) => void;
  showDots?: boolean;
}

export function DefenseLines({ slots, playersById, readOnly, onRemoveFromSlot, onAddLine, onTapSlot, showDots }: DefenseLinesProps) {
  return (
    <div>
      {/* Header row — spacers in col 0 and col 3 align labels with the slots */}
      <div className={`grid gap-2 mb-2 ${DEFENSE_GRID}`}>
        <div />
        {DEFENSE_POSITIONS.map((pos) => (
          <div key={pos} className="text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            {pos}
          </div>
        ))}
        <div />
      </div>

      <div className="space-y-1.5">
        {slots.map((slot) => (
          <div key={slot.id} className={`grid gap-2 ${DEFENSE_GRID}`}>
            <div />
            {DEFENSE_POSITIONS.map((pos) => {
              const col = POSITION_TO_COLUMN[pos];
              const playerId = slot[col as keyof DefenseLineSlot] as string | null;
              const slotRef: SlotRef = { table: 'defense_line_slots', slotId: slot.id, column: col, position: pos };
              return (
                <PositionSlot
                  key={pos}
                  slotRef={slotRef}
                  player={playerId ? (playersById.get(playerId) ?? null) : null}
                  playersById={playersById}
                  readOnly={readOnly}
                  onRemove={onRemoveFromSlot ? () => onRemoveFromSlot(slotRef) : undefined}
                  onTapSlot={onTapSlot ? () => onTapSlot(slotRef) : undefined}
                  showDots={showDots}
                />
              );
            })}
            <div />
          </div>
        ))}
      </div>

      {!readOnly && onAddLine && slots.length < 4 && (
        <button
          onClick={onAddLine}
          className="mt-2 text-xs"
          style={{ color: 'var(--accent)' }}
        >
          + Add pair {slots.length + 1}
        </button>
      )}
    </div>
  );
}
